import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/super-admin/"], // Keep admin private
    },
    sitemap: "https://copdrop.io/sitemap.xml",
  };
}
