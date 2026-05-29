import type { MetadataRoute } from "next";

/**
 * Marketing-side sitemap. robots.txt points at /sitemap.xml; Next surfaces this
 * file at that URL automatically. We list the public pages only — app/admin
 * subdomains are noindexed via the header in next.config.mjs.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shyftforce.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = APP_URL.replace(/\/$/, "").replace(/\/\/app\./, "//").replace(/\/\/admin\./, "//");
  const now = new Date();

  return [
    { url: `${base}/`,           lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/pricing`,    lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
