import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// La fecha que ambas páginas declaran en su propio texto.
const LEGAL_LAST_MODIFIED = new Date("2026-03-01T00:00:00.000Z");

type PublishedAsset = { id: string; updatedAt: string };

async function fetchPublishedAssets(): Promise<PublishedAsset[]> {
  try {
    const res = await fetch(
      `${API_URL}/assets?status=published&limit=200&page=1`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

function timeOf(value: string, fallback: Date): Date {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? new Date(t) : fallback;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buildTime = new Date();
  const assets = await fetchPublishedAssets();

  const assetTimes = assets
    .map((a) => new Date(a.updatedAt).getTime())
    .filter((t) => Number.isFinite(t));

  // El catálogo cambia con su inventario, no con el redeploy.
  const catalogLastModified = assetTimes.length
    ? new Date(Math.max(...assetTimes))
    : buildTime;

  return [
    {
      url: SITE_URL,
      lastModified: buildTime,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/assets`,
      lastModified: catalogLastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    // /login y /register NO van en el sitemap: `app/(auth)/layout.tsx` las
    // marca `robots: { index: false }`. Listarlas acá le pide a Google que
    // indexe una URL que después le dice noindex -> "Submitted URL marked
    // noindex" en Search Console.
    {
      url: `${SITE_URL}/terms`,
      lastModified: LEGAL_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: LEGAL_LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...assets.map((a) => ({
      url: `${SITE_URL}/assets/${a.id}`,
      lastModified: timeOf(a.updatedAt, buildTime),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
