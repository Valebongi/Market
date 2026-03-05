import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://davinci-inventa.com";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/assets`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const res = await fetch(
      `${API_URL}/assets?status=published&limit=200&page=1`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      const assetRoutes: MetadataRoute.Sitemap = (data.data ?? []).map(
        (asset: { id: string; updatedAt: string }) => ({
          url: `${SITE_URL}/assets/${asset.id}`,
          lastModified: new Date(asset.updatedAt),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        })
      );
      return [...staticRoutes, ...assetRoutes];
    }
  } catch {
    // Si la API no está disponible en build time, devuelve solo rutas estáticas
  }

  return staticRoutes;
}
