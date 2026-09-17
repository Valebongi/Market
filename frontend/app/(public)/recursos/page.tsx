import type { Metadata } from "next";
import Link from "next/link";

import { serializeJsonLd } from "@/lib/security";
import { SITE_URL } from "@/lib/site";
import { GUIDES } from "./_content/guides";

const TITLE = "Guías sobre licencias";
const DESCRIPTION =
  "Guías prácticas para licenciar una marca, monetizar un software, licenciar una patente y decidir cuánto cobrar por una licencia en Argentina.";
const URL = `${SITE_URL}/recursos`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: `${TITLE} | Da Vinci Inventa`,
    description: DESCRIPTION,
    url: URL,
    type: "website",
    images: [{ url: "/Logo DaVinci.png", width: 512, height: 512, alt: "Da Vinci Inventa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Da Vinci Inventa`,
    description: DESCRIPTION,
    images: ["/Logo DaVinci.png"],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Recursos", item: URL },
  ],
};

export default function RecursosPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />

      <div className="border-b border-fog-gray dark:border-white/10 bg-gradient-to-b from-[#f0f9ff] to-white dark:from-[#0d1a2e] dark:to-[#0d1117]">
        <div className="container-market px-4 sm:px-6 py-12 sm:py-16">
          <h1 className="max-w-4xl text-4xl sm:text-5xl font-bold text-carbon-gray dark:text-white leading-tight font-display">
            Guías sobre licencias
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-gray dark:text-gray-400 leading-relaxed">
            Estas guías explican, paso a paso, cómo licenciar distintos activos
            intelectuales y cómo ponerle precio a una licencia. Están pensadas
            para titulares y emprendedores, con lenguaje simple y sin
            reemplazar el asesoramiento de un profesional.
          </p>
        </div>
      </div>

      <div className="container-market px-4 sm:px-6 py-12">
        <h2 className="sr-only">Todas las guías</h2>
        <ul className="grid gap-6 md:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/recursos/${g.slug}`}
                className="block h-full rounded-2xl border border-fog-gray dark:border-white/10 p-6 hover:border-electric-blue transition-colors"
              >
                <h3 className="text-xl font-semibold text-carbon-gray dark:text-gray-100">{g.h1}</h3>
                <p className="mt-2 text-sm text-slate-gray dark:text-gray-400 leading-relaxed">{g.description}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-electric-blue">Leer la guía</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
