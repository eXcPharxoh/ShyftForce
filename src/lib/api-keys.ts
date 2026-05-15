// Public API key model. Format: `sfk_live_<base64url-32>` where the prefix is
// kept plaintext (so we can look up keys without an exhaustive hash check)
// and the rest is bcrypt-hashed. Each key has a scopes whitelist.
//
// Verification flow:
//   1. Pull the key out of Authorization: Bearer <key>
//   2. Parse the prefix (first 16 chars including "sfk_live_")
//   3. SELECT WHERE prefix = ? AND revokedAt IS NULL
//   4. bcrypt-compare the full key against keyHash
//   5. Check the requested scope is in the key's scope list
//   6. Touch lastUsedAt

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const PREFIX_LIVE = "sfk_live_";
const PREFIX_TEST = "sfk_test_";
const PREFIX_LENGTH = 16; // "sfk_live_xxxxxxx" — enough entropy to be unique-ish

export type ApiScope =
  | "read:members"   | "write:members"
  | "read:shifts"    | "write:shifts"
  | "read:time_off"  | "write:time_off"
  | "read:timesheets" | "write:timesheets"
  | "read:reports";

export const ALL_SCOPES: ApiScope[] = [
  "read:members", "write:members",
  "read:shifts", "write:shifts",
  "read:time_off", "write:time_off",
  "read:timesheets", "write:timesheets",
  "read:reports",
];

export function generateApiKey(mode: "live" | "test" = "live"): { fullKey: string; prefix: string } {
  const prefix = mode === "live" ? PREFIX_LIVE : PREFIX_TEST;
  const random = randomBytes(28).toString("base64url"); // ~37 chars
  const fullKey = prefix + random;
  return { fullKey, prefix: fullKey.slice(0, PREFIX_LENGTH) };
}

export type AuthedKey = {
  organizationId: string;
  keyId:          string;
  scopes:         string[];
};

/** Verify the Authorization header and return the key's org + scopes, or null. */
export async function verifyApiKey(authHeader: string | null | undefined): Promise<AuthedKey | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith(PREFIX_LIVE) && !raw.startsWith(PREFIX_TEST)) return null;
  const prefix = raw.slice(0, PREFIX_LENGTH);

  const candidates = await prisma.apiKey.findMany({
    where: { prefix, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { id: true, keyHash: true, scopes: true, organizationId: true },
  });

  for (const c of candidates) {
    const ok = await bcrypt.compare(raw, c.keyHash);
    if (!ok) continue;
    // Touch lastUsedAt — fire-and-forget so we don't hold the request
    prisma.apiKey.update({ where: { id: c.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    let scopes: string[] = [];
    try { scopes = JSON.parse(c.scopes); } catch {}
    return { organizationId: c.organizationId, keyId: c.id, scopes };
  }
  return null;
}

export function hasScope(authed: AuthedKey, required: ApiScope | ApiScope[]): boolean {
  const need = Array.isArray(required) ? required : [required];
  return need.every(s => authed.scopes.includes(s) || authed.scopes.includes("*"));
}

/** Wrap a route handler with API-key auth. Returns 401/403 if invalid. */
export function withApiKey<T>(
  required: ApiScope | ApiScope[],
  handler: (req: Request, ctx: { authed: AuthedKey; params?: any }) => Promise<T>,
) {
  return async (req: Request, ctx?: any): Promise<any> => {
    const authed = await verifyApiKey(req.headers.get("authorization"));
    if (!authed) {
      return Response.json({ error: "Invalid or missing API key", docs: "https://shyftforce.com/docs/api" }, { status: 401 });
    }
    if (!hasScope(authed, required)) {
      return Response.json({ error: "Missing required scope", required: Array.isArray(required) ? required : [required] }, { status: 403 });
    }
    try {
      return await handler(req, { authed, params: ctx?.params });
    } catch (e: any) {
      console.error("[api]", e);
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

export async function createApiKey(opts: {
  organizationId: string;
  name: string;
  scopes: string[];
  createdById?: string;
  expiresAt?: Date;
}): Promise<{ fullKey: string; record: { id: string; prefix: string } }> {
  const { fullKey, prefix } = generateApiKey("live");
  const keyHash = await bcrypt.hash(fullKey, 10);
  const record = await prisma.apiKey.create({
    data: {
      organizationId: opts.organizationId,
      name: opts.name,
      prefix,
      keyHash,
      scopes: JSON.stringify(opts.scopes),
      createdById: opts.createdById ?? null,
      expiresAt: opts.expiresAt ?? null,
    },
    select: { id: true, prefix: true },
  });
  return { fullKey, record };
}
