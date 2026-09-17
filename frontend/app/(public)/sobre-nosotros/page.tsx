import type { Metadata } from "next";
import Link from "next/link";

import { CONTACT_EMAILS, PARENT_ORGANIZATION } from "@/lib/organization";
import { serializeJsonLd } from "@/lib/security";
import { SITE_URL } from "@/lib/site";

const TITLE = "Sobre Da Vinci Inventa";
const DESCRIPTION =
  "Qué es Da Vinci Inventa, el marketplace de licencias de Digital Axios que conecta a titulares de activos intelectuales con emprendedores en Argentina.";
const URL = `${SITE_URL}/sobre-nosotros`;

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | Marketplace de licencias` },
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: `${TITLE} | Marketplace de licencias`,
    description: DESCRIPTION,
    url: URL,
    type: "website",
    images: [{ url: "/Logo DaVinci.png", width: 512, height: 512, alt: "Da Vinci Inventa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Marketplace de licencias`,
    description: DESCRIPTION,
    images: ["/Logo DaVinci.png"],
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: TITLE, item: URL },
  ],
};

const SECTION = "container-market px-4 sm:px-6 py-12 sm:py-14";
const H2 = "text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100";
const TEXT = "mt-3 text-base text-slate-gray dark:text-gray-400 leading-relaxed";
const CARD = "rounded-2xl border border-fog-gray dark:border-white/10 p-6";

// TODO(owner): año de fundación, ubicación y equipo. Sumarlos como sección cuando estén.
export default function SobreNosotrosPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />

      <div className="border-b border-fog-gray dark:border-white/10 bg-gradient-to-b from-[#f0f9ff] to-white dark:from-[#0d1a2e] dark:to-[#0d1117]">
        <div className="container-market px-4 sm:px-6 py-12 sm:py-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-carbon-gray dark:text-white leading-tight font-display">
            Sobre Da Vinci Inventa
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-gray dark:text-gray-400 leading-relaxed">
            Da Vinci Inventa es un marketplace de licencias argentino. Conecta a
            quienes tienen un activo intelectual, como un software, un diseño o
            una marca, con emprendedores que quieren licenciarlo.
          </p>
        </div>
      </div>

      <div className={`${SECTION} grid gap-6 lg:grid-cols-3`}>
        <section aria-labelledby="mision" className={CARD}>
          <h2 id="mision" className={H2}>Nuestra misión</h2>
          {/* TODO(owner): confirmar o reemplazar la misión. */}
          <p className={TEXT}>
            Que quien crea un activo intelectual pueda generar ingresos con él,
            y que quien emprende pueda usarlo sin empezar desde cero.
          </p>
        </section>

        <section aria-labelledby="digital-axios" className={CARD}>
          <h2 id="digital-axios" className={H2}>Parte de {PARENT_ORGANIZATION.name}</h2>
          <p className={TEXT}>
            Da Vinci Inventa es un producto de {PARENT_ORGANIZATION.name}, una
            empresa de Córdoba, Argentina, que desarrolla sistemas a medida para
            empresas en crecimiento. {PARENT_ORGANIZATION.name} también publica
            sus propios activos en la plataforma, identificados como oficiales.
          </p>
          {PARENT_ORGANIZATION.url && (
            <a
              href={PARENT_ORGANIZATION.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-electric-blue hover:underline"
            >
              Conocé {PARENT_ORGANIZATION.name}
            </a>
          )}
        </section>

        <section aria-labelledby="como-trabajamos" className={CARD}>
          <h2 id="como-trabajamos" className={H2}>Cómo trabajamos</h2>
          <p className={TEXT}>
            Ponemos en contacto a las partes y alojamos la conversación. No
            verificamos la titularidad de los activos, no procesamos pagos y no
            somos parte del contrato.
          </p>
          <Link href="/como-funciona" className="mt-4 inline-block text-sm font-semibold text-electric-blue hover:underline">
            Ver cómo funciona
          </Link>
        </section>
      </div>

      <div className="border-t border-fog-gray dark:border-white/10">
        <section aria-labelledby="contacto" className={SECTION}>
          <h2 id="contacto" className={H2}>Contacto</h2>
          <p className={`${TEXT} max-w-3xl`}>
            Escribinos a la dirección que corresponda a tu consulta.
          </p>
          <dl className="mt-6 grid gap-6 sm:grid-cols-3">
            {[
              { label: "Soporte", email: CONTACT_EMAILS.soporte },
              { label: "Privacidad", email: CONTACT_EMAILS.privacidad },
              { label: "Temas legales", email: CONTACT_EMAILS.legal },
            ].map((c) => (
              <div key={c.email} className={CARD}>
                <dt className="font-semibold text-carbon-gray dark:text-gray-100">{c.label}</dt>
                <dd className="mt-2 text-sm">
                  <a href={`mailto:${c.email}`} className="text-electric-blue hover:underline break-all">
                    {c.email}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
