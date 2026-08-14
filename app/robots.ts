import type { MetadataRoute } from "next";

export const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://crabs3.doctorpok.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/file/", "/secret/", "/dashboard", "/admin", "/logs", "/me", "/services", "/communication", "/secrets"],
      },
    ],
    sitemap: base + "/sitemap.xml",
    host: base,
  };
}
