import { MetadataRoute } from "next";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://copdrop.io";

  // 1. Static Routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/create-store`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  // 2. Fetch Active Stores
  try {
    const storesSnapshot = await getDocs(
      query(collection(db, "stores"), where("status", "==", "live"))
    );

    const storeRoutes: MetadataRoute.Sitemap = storesSnapshot.docs.map(
      (doc) => {
        const data = doc.data();
        return {
          url: `${baseUrl}/shop/${doc.id}`, // We should probably use slugs if available, but storeId is the route
          lastModified: new Date(), // Ideally check updated field
          changeFrequency: "weekly",
          priority: 0.9,
        };
      }
    );

    return [...routes, ...storeRoutes];
  } catch (error) {
    console.error("Sitemap gen error:", error);
    return routes;
  }
}
