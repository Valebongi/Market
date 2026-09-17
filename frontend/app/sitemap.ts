import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { CATEGORY_LANDINGS } from "./(public)/assets/_components/category-landings";
import { GUIDES } from "./(public)/recursos/_content/guides";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// La fecha que ambas páginas declaran en su propio texto.
const LEGAL_LAST_MODIFIED = new Date("2026-03-01T00:00:00.000Z");
// Actualizar a mano cuando cambie el contenido de cada página.
const COMO_FUNCIONA_LAST_MODIFIED = new Date("2026-09-17T00:00:00.000Z");
const SOBRE_NOSOTROS_LAST_MODIFIED = new Date("2026-09-17T00:00:00.000Z");

type PublishedAsset = { id: string; updatedAt: string; category?: string };

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
    {
      url: `${SITE_URL}/como-funciona`,
      lastModified: COMO_FUNCIONA_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/sobre-nosotros`,
      lastModified: SOBRE_NOSOTROS_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/recursos`,
      lastModified: new Date(Math.max(...GUIDES.map((g) => new Date(g.dateModified).getTime()))),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/recursos/${g.slug}`,
      lastModified: new Date(g.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // Solo las landings con activos: las vacías son `noindex` y no van al sitemap.
    ...CATEGORY_LANDINGS.flatMap((landing) => {
      const times = assets
        .filter((a) => a.category === landing.category)
        .map((a) => new Date(a.updatedAt).getTime())
        .filter((t) => Number.isFinite(t));
      if (times.length === 0) return [];
      return [{
        url: `${SITE_URL}/assets/${landing.slug}`,
        lastModified: new Date(Math.max(...times)),
        changeFrequency: "daily" as const,
        priority: 0.8,
      }];
    }),
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
