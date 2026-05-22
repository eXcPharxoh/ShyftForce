// SSRF guard for customer-supplied webhook URLs.
//
// A MANAGER/ADMIN can register an arbitrary webhook URL. Without a guard they
// could point it at internal infrastructure (cloud metadata at 169.254.169.254,
// localhost admin panels, RFC-1918 ranges) and use our server as a confused
// deputy to reach it — and we even store the response body. This validates the
// URL at registration time AND re-validates at delivery time (DNS can change
// between the two — a rebinding attack).

import { lookup } from "node:dns/promises";
import net from "node:net";

/** True if an IP literal falls in a private / loopback / link-local / reserved range. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const o = ip.split(".").map(Number);
    if (o[0] === 0) return true;                          // 0.0.0.0/8
    if (o[0] === 10) return true;                         // 10.0.0.0/8
    if (o[0] === 127) return true;                        // loopback
    if (o[0] === 169 && o[1] === 254) return true;        // link-local + cloud metadata
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true; // 172.16.0.0/12
    if (o[0] === 192 && o[1] === 168) return true;        // 192.168.0.0/16
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true; // CGNAT 100.64.0.0/10
    if (o[0] >= 224) return true;                         // multicast / reserved
    return false;
  }
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::1" || v === "::") return true;             // loopback / unspecified
  if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique-local fc00::/7
  if (v.startsWith("fe80")) return true;                  // link-local
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7)); // IPv4-mapped
  return false;
}

/**
 * Throws if the URL is not a safe, public http(s) endpoint.
 * Resolves the hostname and rejects if ANY resolved address is private.
 */
export async function assertPublicWebhookUrl(rawUrl: string): Promise<void> {
  let u: URL;
  try { u = new URL(rawUrl); }
  catch { throw new Error("Invalid webhook URL"); }

  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Webhook URL must use http or https");
  }

  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    throw new Error("Webhook URL cannot target an internal host");
  }

  // IP literal — check directly, no DNS.
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error("Webhook URL cannot target a private or reserved IP");
    return;
  }

  // Hostname — resolve every A/AAAA record and reject if any is private.
  let addrs: { address: string }[];
  try { addrs = await lookup(host, { all: true }); }
  catch { throw new Error("Webhook host could not be resolved"); }
  if (addrs.length === 0) throw new Error("Webhook host could not be resolved");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error("Webhook URL resolves to a private or reserved IP");
    }
  }
}
