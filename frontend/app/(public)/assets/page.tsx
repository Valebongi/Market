import { permanentRedirect } from "next/navigation";

import CatalogView, { catalogMetadata, parseCatalogParams, type SearchParams } from "./_components/CatalogView";
import { catalogHref } from "./_components/catalog";
import { landingForCategory } from "./_components/category-landings";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return catalogMetadata(await searchParams);
}

export default async function AssetsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  // `?category=software` pasó a ser `/assets/software`: una sola URL por categoría.
  const { category, activeParams } = parseCatalogParams(sp);
  if (category && landingForCategory(category)) {
    permanentRedirect(catalogHref(activeParams));
  }

  return <CatalogView sp={sp} />;
}
