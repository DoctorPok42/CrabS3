import { MetadataRoute } from "next";
import { base } from "./robots";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
  ];
}
