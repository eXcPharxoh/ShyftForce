// RFC 6238 TOTP (Time-based One-Time Password) + base32 + otpauth URI.
// Compatible with Google Authenticator, Authy, 1Password, Microsoft
// Authenticator. Implemented in ~100 lines so we don't pull in `otplib`
// or `speakeasy` for the bundle.

import { createHmac, randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = BASE32_ALPHABET.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Generate the 6-digit TOTP code for a given secret + timestamp (ms). */
export function generateCode(secret: string, timestamp: number = Date.now(), step = 30, digits = 6): string {
  const counter = Math.floor(timestamp / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncated = ((hmac[offset] & 0x7f) << 24) | (hmac[offset+1] << 16) | (hmac[offset+2] << 8) | hmac[offset+3];
  const code = (truncated % 10 ** digits).toString().padStart(digits, "0");
  return code;
}

/** Verify a user-supplied code. Accepts ±1 step skew for clock drift. */
export function verifyCode(secret: string, code: string, timestamp: number = Date.now(), step = 30, digits = 6, window = 1): boolean {
  if (!/^\d+$/.test(code) || code.length !== digits) return false;
  for (let skew = -window; skew <= window; skew++) {
    if (generateCode(secret, timestamp + skew * step * 1000, step, digits) === code) return true;
  }
  return false;
}

/** otpauth:// URI for QR code rendering. */
export function otpauthUri(opts: { issuer: string; account: string; secret: string }): string {
  const label = encodeURIComponent(`${opts.issuer}:${opts.account}`);
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Build 10 single-use 8-digit recovery codes. */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).readUInt32BE(0).toString(10).padStart(10, "0").slice(0, 8)
      .replace(/(\d{4})(\d{4})/, "$1-$2"));
}
