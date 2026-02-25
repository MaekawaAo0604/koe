import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/wall/"],
        disallow: [
          "/dashboard/",
          "/projects/",
          "/billing/",
          "/api/",
          "/f/",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
