import type { MetadataRoute } from "next";
import { IS_CANONICAL_INSTANCE, SITE_URL } from "@/lib/publicSite";

export default function sitemap(): MetadataRoute.Sitemap {
  const home = {
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 1,
  };

  if (!IS_CANONICAL_INSTANCE) return [home];

  return [
    home,
    { url: `${SITE_URL}/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/self-hosting`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}
