import type { Metadata } from "next";
import LandingMarketplace from "./_components/LandingMarketplace";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vinciinventa.com";
const DESCRIPTION =
  "Marketplace de activos intelectuales en Argentina. Software, diseños, marcas y modelos de negocio listos para licenciar. Conectá con titulares y hacé crecer tu proyecto.";

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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Da Vinci Inventa",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/Logo DaVinci.png` },
      description: DESCRIPTION,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingMarketplace />
    </>
  );
}
