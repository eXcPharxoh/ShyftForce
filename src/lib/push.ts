// Web Push helper. We implement the bare minimum of RFC 8030 + VAPID
// ourselves rather than pulling in `web-push` so the edge bundle stays tiny.
// Works on Chrome, Firefox, Edge, and iOS 16.4+ Safari (PWA-installed only).
//
// Setup:
//   1. Generate a VAPID keypair once (see scripts in package.json) and set
//      NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY + VAPID_SUBJECT in env.
//   2. Client subscribes via service worker → POST to /api/me/push/subscribe.
//   3. Server-side, call sendPush(userId, {title, body, url}) any time you
//      want to fire a notification.

import { createSign, createHash, createHmac, randomBytes, createECDH } from "node:crypto";
import { prisma } from "@/lib/prisma";

type Payload = {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string; // dedupe key — newer push with same tag replaces older
  icon?: string;
};

type SendOptions = {
  ttlSeconds?: number;
  urgency?:    "very-low" | "low" | "normal" | "high";
};

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:noreply@shyftforce.com";

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

/** Build the VAPID JWT (Authorization: vapid t=<jwt>, k=<publicKey>) header. */
function buildVapidAuthHeader(audience: string): string {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) throw new Error("VAPID keys not configured");
  const header = b64urlEncode(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64urlEncode(Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600, // 12h max per spec
    sub: VAPID_SUBJECT,
  })));
  const unsigned = `${header}.${payload}`;

  // VAPID requires P-256 (prime256v1) ECDSA. Build a PEM key from the raw 32-byte private key.
  const pkBytes = b64urlDecode(VAPID_PRIVATE);
  // PKCS8 wrapper for a raw 32-byte P-256 private key.
  // Magic prefix below is the constant ASN.1 header for "PrivateKeyInfo {algorithm: ecPublicKey + prime256v1, key: ec PrivateKey ...}".
  // We assemble it dynamically so we don't depend on `jose` or `web-push`.
  const pubBytes = b64urlDecode(VAPID_PUBLIC); // 65-byte uncompressed point
  if (pkBytes.length !== 32) throw new Error("VAPID_PRIVATE_KEY must be 32 bytes (base64url-decoded)");
  if (pubBytes.length !== 65) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY must be 65 bytes (uncompressed point)");

  const pkcs8 = Buffer.concat([
    Buffer.from([0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
                 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
                 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
                 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01,
                 0x04, 0x20]),
    pkBytes,
    Buffer.from([0xa1, 0x44, 0x03, 0x42, 0x00]),
    pubBytes,
  ]);
  const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.toString("base64").match(/.{1,64}/g)?.join("\n")}\n-----END PRIVATE KEY-----`;

  // Sign the unsigned token with ES256 → DER → r||s raw
  const signer = createSign("SHA256");
  signer.update(unsigned);
  signer.end();
  const der = signer.sign({ key: pem, dsaEncoding: "ieee-p1363" });   // node returns r||s raw with ieee-p1363
  const jwt = `${unsigned}.${b64urlEncode(der)}`;

  return `vapid t=${jwt}, k=${VAPID_PUBLIC}`;
}

/** Encrypt the payload with the subscription's keys per RFC 8291 (aes128gcm). */
function encryptPayload(payload: Buffer, p256dh: string, auth: string): { ciphertext: Buffer; localPublicKey: Buffer; salt: Buffer } {
  const userPublicKey = b64urlDecode(p256dh);
  const authSecret    = b64urlDecode(auth);

  // 1. Generate an ephemeral ECDH keypair (local server side)
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const localPublicKey = ecdh.getPublicKey();
  const sharedSecret   = ecdh.computeSecret(userPublicKey);

  // 2. Salt
  const salt = randomBytes(16);

  // 3. HKDF: derive PRK
  const prkKeyInfo = Buffer.concat([Buffer.from("WebPush: info\0", "utf8"), userPublicKey, localPublicKey]);
  const prkKey = hkdf(authSecret, sharedSecret, prkKeyInfo, 32);

  // 4. HKDF: derive content encryption key (16 bytes) + nonce (12 bytes)
  const cekInfo   = Buffer.from("Content-Encoding: aes128gcm\0", "utf8");
  const cek       = hkdf(salt, prkKey, cekInfo, 16);
  const nonceInfo = Buffer.from("Content-Encoding: nonce\0", "utf8");
  const nonce     = hkdf(salt, prkKey, nonceInfo, 12);

  // 5. Pad payload + delimiter
  const padded = Buffer.concat([payload, Buffer.from([0x02])]);

  // 6. AES-128-GCM
  const { createCipheriv } = require("node:crypto") as typeof import("node:crypto");
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);
  const tag = cipher.getAuthTag();
  const body = Buffer.concat([encrypted, tag]);

  // 7. Assemble the aes128gcm content-encoding header
  const recordSize = body.length + 1; // include delimiter byte
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(recordSize, 16);
  header.writeUInt8(localPublicKey.length, 20);

  return {
    ciphertext: Buffer.concat([header, localPublicKey, body]),
    localPublicKey, salt,
  };
}

function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  // HKDF-SHA256 extract-then-expand
  const prk = createHmac("sha256", salt).update(ikm).digest();
  const out: Buffer[] = []; let prev = Buffer.alloc(0); let i = 1;
  while (Buffer.concat(out).length < length) {
    prev = createHmac("sha256", prk).update(Buffer.concat([prev, info, Buffer.from([i])])).digest();
    out.push(prev); i++;
  }
  return Buffer.concat(out).subarray(0, length);
}

/** Send a push to a single subscription. Cleans up expired subs (410). */
async function sendToEndpoint(opts: {
  endpoint: string; p256dh: string; auth: string;
  payload: Payload; ttlSeconds: number; urgency: string;
}): Promise<{ ok: boolean; status: number; gone: boolean }> {
  const url = new URL(opts.endpoint);
  const auth = buildVapidAuthHeader(`${url.protocol}//${url.host}`);
  const { ciphertext } = encryptPayload(Buffer.from(JSON.stringify(opts.payload), "utf8"), opts.p256dh, opts.auth);

  const res = await fetch(opts.endpoint, {
    method: "POST",
    headers: {
      "Authorization":     auth,
      "Content-Encoding":  "aes128gcm",
      "Content-Type":      "application/octet-stream",
      "TTL":               String(opts.ttlSeconds),
      "Urgency":           opts.urgency,
    },
    // Node's Buffer is compatible with fetch body at runtime, but the lib type
    // insists on BodyInit. Cast through `any` — the underlying ArrayBuffer
    // ships fine.
    body: ciphertext as any,
  });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}

/** Send a push to every subscription belonging to a user. */
export async function sendPush(userId: string, payload: Payload, opts: SendOptions = {}): Promise<{ sent: number; failed: number; pruned: number }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log(`🔔 [PUSH → user:${userId}] (no VAPID config) ${payload.title}: ${payload.body}`);
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0, failed: 0, pruned: 0 };

  const ttl = opts.ttlSeconds ?? 60 * 60 * 24; // 24h default
  const urgency = opts.urgency ?? "normal";

  let sent = 0, failed = 0, pruned = 0;
  await Promise.all(subs.map(async s => {
    try {
      const r = await sendToEndpoint({
        endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth,
        payload, ttlSeconds: ttl, urgency,
      });
      if (r.gone) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        pruned++;
      } else if (r.ok) {
        sent++;
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
      console.error("[push] send failed:", e);
    }
  }));
  return { sent, failed, pruned };
}
