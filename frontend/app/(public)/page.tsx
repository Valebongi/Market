import type { Metadata } from "next";
import LandingMarketplace from "./_components/LandingMarketplace";
import HomeContent from "./_components/HomeContent";
import { activeSocialLinks, CONTACT_EMAILS, PARENT_ORGANIZATION } from "@/lib/organization";
import { serializeJsonLd } from "@/lib/security";
import { SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Marketplace de licencias en Argentina. Encontrá software, diseños y marcas para licenciar, o publicá tu activo y monetizá tu propiedad intelectual.";

export const metadata: Metadata = {
  // `absolute` evita que el template "%s | Da Vinci Inventa" del root layout
  // duplique la marca: sin esto el <title> sale
  // "Da Vinci Inventa – Marketplace de Licencias | Da Vinci Inventa".
  title: { absolute: "Da Vinci Inventa – Marketplace de Licencias" },
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Da Vinci Inventa – Marketplace de Licencias",
    description: DESCRIPTION,
    url: SITE_URL,
    type: "website",
    images: [{ url: "/Logo DaVinci.png", width: 512, height: 512, alt: "Da Vinci Inventa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Da Vinci Inventa – Marketplace de Licencias",
    description: DESCRIPTION,
    images: ["/Logo DaVinci.png"],
  },
};

const sameAs = activeSocialLinks().map((l) => l.url);

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Da Vinci Inventa",
      alternateName: "vinciinventa",
      url: SITE_URL,
      // El espacio del nombre de archivo tiene que ir codificado para ser una URL válida.
      logo: { "@type": "ImageObject", url: `${SITE_URL}/Logo%20DaVinci.png` },
      description: DESCRIPTION,
      areaServed: "AR",
      email: CONTACT_EMAILS.soporte,
      parentOrganization: {
        "@type": "Organization",
        name: PARENT_ORGANIZATION.name,
        ...(PARENT_ORGANIZATION.url ? { url: PARENT_ORGANIZATION.url } : {}),
      },
      ...(sameAs.length ? { sameAs } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Da Vinci Inventa",
      publisher: { "@id": `${SITE_URL}/#organization` },
      // El `SearchAction` apuntaba a `/?search=`, y la home no lee ese
      // parámetro: era markup declarándole a Google una capacidad inexistente,
      // el mismo criterio por el que se sacaron `seller` y `availability` del
      // `Product`. Ahora apunta a `/assets?search=`, que desde que el catálogo
      // es SSR sí filtra de verdad.
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/assets?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <LandingMarketplace>
        <HomeContent />
      </LandingMarketplace>
    </>
  );
}
