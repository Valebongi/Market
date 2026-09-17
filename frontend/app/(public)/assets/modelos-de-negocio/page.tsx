import CatalogView, { catalogMetadata, type SearchParams } from "../_components/CatalogView";
import { landingForSlug } from "../_components/category-landings";

const landing = landingForSlug("modelos-de-negocio");

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return catalogMetadata(await searchParams, landing);
}

export default async function CategoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <CatalogView sp={await searchParams} landing={landing} />;
}
