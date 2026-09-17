import type { Metadata } from "next";
import Link from "next/link";

import { ASSET_CATEGORIES } from "@/lib/asset-categories";
import { catalogHref } from "../assets/_components/catalog";
import { landingForCategory } from "../assets/_components/category-landings";
import { serializeJsonLd } from "@/lib/security";
import { SITE_URL } from "@/lib/site";

const TITLE = "Cómo licenciar propiedad intelectual";
const DESCRIPTION =
  "Qué es licenciar propiedad intelectual, tipos de licencia (exclusiva, no exclusiva, temporal) y cómo funciona Da Vinci Inventa paso a paso.";
const URL = `${SITE_URL}/como-funciona`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  // Sin `images` acá, Next no hereda la del root y la página queda sin og:image.
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

const OWNER_STEPS = [
  { title: "Creá tu cuenta.", text: "Podés registrarte con tu email o con tu cuenta de Google o GitHub." },
  {
    title: "Publicá tu activo.",
    text: "Contá qué es y elegí el tipo de licencia, el precio (fijo, a negociar o gratis), el territorio, la duración y los usos que permitís.",
  },
  {
    title: "Recibí solicitudes.",
    text: "Quien está interesado te escribe desde la ficha del activo, contándote para qué lo quiere y, si quiere, con términos propuestos.",
  },
  {
    title: "Aceptá o rechazá.",
    text: "Conversás por mensajes dentro de la plataforma y decidís si aceptás o rechazás cada solicitud.",
  },
];

const SEEKER_STEPS = [
  {
    title: "Explorá el catálogo.",
    text: "Filtrá por categoría y por tipo de licencia. Cada ficha muestra las condiciones que ofrece el titular.",
  },
  {
    title: "Pedí la licencia.",
    text: "Desde la ficha del activo le mandás un mensaje al titular con lo que necesitás. Para eso tenés que tener una cuenta.",
  },
  {
    title: "Negociá las condiciones.",
    text: "Hablan por mensajes hasta que el titular acepta o rechaza tu solicitud.",
  },
  {
    title: "Cerrá el acuerdo por fuera.",
    text: "El contrato y el pago los resuelven entre ustedes, con sus propios términos.",
  },
];

// Las respuestas se usan tal cual en la página y en el JSON-LD: tienen que coincidir.
// TODO(owner): sumar "¿Cuánto cuesta usar Da Vinci Inventa?" cuando esté definido si hay costo o comisión.
const FAQS = [
  {
    q: "¿Quién define el precio de una licencia?",
    a: "El titular, al publicar el activo. Puede fijar un precio, dejarlo a negociar u ofrecer la licencia gratis.",
  },
  {
    q: "¿Da Vinci Inventa verifica que el titular sea dueño del activo?",
    a: "No. La plataforma no verifica la titularidad de los activos publicados. Antes de cerrar un acuerdo, pedile al titular la documentación que respalde sus derechos.",
  },
  {
    q: "¿Cómo se paga una licencia?",
    a: "El pago se acuerda y se hace fuera de la plataforma. Da Vinci Inventa no procesa pagos.",
  },
  {
    q: "¿Quién redacta el contrato de licencia?",
    a: "Las partes. Da Vinci Inventa no es parte del contrato. Para redactarlo conviene consultar a un abogado o a un agente de propiedad intelectual.",
  },
  {
    q: "¿Puedo licenciar un activo que no está registrado?",
    a: "Depende del activo y de la legislación que aplique. Da Vinci Inventa no da asesoramiento legal: consultalo con un profesional antes de publicarlo o de licenciarlo.",
  },
  {
    q: "¿Qué pasa después de enviar una solicitud?",
    a: "La solicitud queda pendiente hasta que el titular la acepta o la rechaza. Mientras tanto pueden intercambiar mensajes dentro de la plataforma.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Cómo funciona", item: URL },
  ],
};

const LICENSES = [
  {
    id: "licencia-exclusiva",
    q: "¿Qué es una licencia exclusiva?",
    lead: "Una licencia exclusiva le da a una sola persona o empresa el derecho de usar el activo en las condiciones acordadas.",
    points: [
      "El titular no puede licenciar el mismo activo a nadie más mientras dure el acuerdo.",
      "Sirve cuando necesitás diferenciarte y que tu competencia no use lo mismo.",
      "El alcance puede limitarse a un territorio, un rubro o un plazo.",
    ],
  },
  {
    id: "licencia-no-exclusiva",
    q: "¿Qué es una licencia no exclusiva?",
    lead: "Una licencia no exclusiva permite que el titular le dé permiso de uso del mismo activo a varias personas a la vez.",
    points: [
      "Otras personas pueden estar usando el mismo activo al mismo tiempo que vos.",
      "Al titular le permite generar ingresos con más de un acuerdo por el mismo activo.",
      "Sirve cuando lo importante es usar el activo, no tenerlo en exclusiva.",
    ],
  },
  {
    id: "licencia-temporal",
    q: "¿Qué es una licencia temporal?",
    lead: "Una licencia temporal permite usar el activo durante un plazo definido. Cuando el plazo termina, se renueva o se deja de usar.",
    points: [
      "La duración queda escrita en las condiciones del activo o en el acuerdo.",
      "Sirve para probar un activo, para una campaña o para un proyecto con fecha de fin.",
    ],
  },
];

const SECTION = "container-market px-4 sm:px-6 py-12 sm:py-14";
const H2 = "text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100";
const LEAD = "mt-3 max-w-3xl text-base text-slate-gray dark:text-gray-400 leading-relaxed";
const CARD = "rounded-2xl border border-fog-gray dark:border-white/10 p-6";
const TEXT = "text-sm text-slate-gray dark:text-gray-400 leading-relaxed";
const STRONG = "font-semibold text-carbon-gray dark:text-gray-200";
const TEXT_LINK = "mt-6 inline-block text-sm font-semibold text-electric-blue hover:underline";

function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="mt-6 space-y-4 list-decimal pl-5 marker:font-semibold marker:text-carbon-gray dark:marker:text-gray-200">
      {steps.map((s) => (
        <li key={s.title} className={TEXT}>
          <span className={STRONG}>{s.title}</span> {s.text}
        </li>
      ))}
    </ol>
  );
}

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />

      <div className="border-b border-fog-gray dark:border-white/10 bg-gradient-to-b from-[#f0f9ff] to-white dark:from-[#0d1a2e] dark:to-[#0d1117]">
        <div className="container-market px-4 sm:px-6 py-12 sm:py-16">
          <h1 className="max-w-4xl text-4xl sm:text-5xl font-bold text-carbon-gray dark:text-white leading-tight font-display">
            Cómo licenciar propiedad intelectual
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-slate-gray dark:text-gray-400 leading-relaxed">
            Licenciar propiedad intelectual es dar permiso para usar algo que
            creaste, como un software, un diseño o una marca, sin dejar de ser
            su titular. En Da Vinci Inventa publicás ese activo, recibís
            solicitudes de quien lo quiere usar y acuerdan las condiciones entre
            ustedes.
          </p>
        </div>
      </div>

      <div className={`${SECTION} grid gap-6 lg:grid-cols-2`}>
        <section aria-labelledby="pasos-titulares" className={CARD}>
          <h2 id="pasos-titulares" className={H2}>Pasos para titulares</h2>
          <p className={LEAD}>
            Si tenés un activo intelectual, lo publicás y esperás solicitudes.
            Vos decidís a quién le das la licencia.
          </p>
          <Steps steps={OWNER_STEPS} />
          <Link href="/register" className={TEXT_LINK}>Publicar mi activo</Link>
        </section>

        <section aria-labelledby="pasos-buscar" className={CARD}>
          <h2 id="pasos-buscar" className={H2}>Pasos para quien busca un activo</h2>
          <p className={LEAD}>
            Si buscás un activo para tu proyecto, lo encontrás en el catálogo y
            le pedís la licencia a su titular.
          </p>
          <Steps steps={SEEKER_STEPS} />
          <Link href="/assets" className={TEXT_LINK}>Explorá el catálogo de activos</Link>
        </section>
      </div>

      <div className="border-y border-fog-gray dark:border-white/10 bg-snow-gray/50 dark:bg-white/[0.02]">
        <div className={`${SECTION} grid gap-6 lg:grid-cols-3`}>
          {LICENSES.map((l) => (
            <section key={l.id} aria-labelledby={l.id} className={`${CARD} bg-white dark:bg-[#0d1117]`}>
              <h2 id={l.id} className="text-xl font-bold text-carbon-gray dark:text-gray-100">{l.q}</h2>
              <p className={`mt-3 ${TEXT}`}>{l.lead}</p>
              <ul className={`mt-4 space-y-2 list-disc pl-5 ${TEXT}`}>
                {l.points.map((pt) => <li key={pt}>{pt}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <div className={`${SECTION} grid gap-6 lg:grid-cols-2`}>
        <section aria-labelledby="que-se-puede-licenciar">
          <h2 id="que-se-puede-licenciar" className={H2}>¿Qué se puede licenciar?</h2>
          <p className={LEAD}>
            En Da Vinci Inventa se pueden licenciar activos de estas siete
            categorías:
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {ASSET_CATEGORIES.map((cat) => (
              <li key={cat.value}>
                <Link
                  href={catalogHref({ category: cat.value })}
                  className="inline-block px-4 py-2 rounded-full text-sm font-medium border border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-300 hover:border-electric-blue hover:text-electric-blue transition-colors"
                >
                  {landingForCategory(cat.value)?.linkLabel ?? cat.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="que-hace" className={CARD}>
          <h2 id="que-hace" className={H2}>Qué hace y qué no hace Da Vinci Inventa</h2>
          <p className={LEAD}>
            Da Vinci Inventa pone en contacto a titulares y a quienes buscan un
            activo. El acuerdo es entre las partes.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold text-carbon-gray dark:text-gray-100">Lo que hace</h3>
              <ul className={`mt-3 space-y-2 list-disc pl-5 ${TEXT}`}>
                <li>Publica los activos y sus condiciones.</li>
                <li>Recibe y ordena las solicitudes de licencia.</li>
                <li>Aloja la conversación entre las partes.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-carbon-gray dark:text-gray-100">Lo que no hace</h3>
              <ul className={`mt-3 space-y-2 list-disc pl-5 ${TEXT}`}>
                <li>No verifica la titularidad de los activos.</li>
                <li>No procesa pagos.</li>
                <li>No es parte del contrato que firmen.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-fog-gray dark:border-white/10">
        <section aria-labelledby="preguntas-frecuentes" className={SECTION}>
          <h2 id="preguntas-frecuentes" className={H2}>Preguntas frecuentes</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {FAQS.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-carbon-gray dark:text-gray-100">{f.q}</dt>
                <dd className={`mt-2 ${TEXT}`}>{f.a}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              href="/register"
              className="inline-flex justify-center items-center px-5 py-2.5 bg-electric-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Publicar mi activo
            </Link>
            <Link
              href="/assets"
              className="inline-flex justify-center items-center px-5 py-2.5 border border-fog-gray dark:border-white/10 text-sm font-semibold text-carbon-gray dark:text-gray-200 rounded-xl hover:bg-snow-gray dark:hover:bg-white/5 transition-colors"
            >
              Explorar activos
            </Link>
          </div>

          <p className="mt-8 text-sm text-slate-gray dark:text-gray-400">
            ¿Querés profundizar?{" "}
            <Link href="/recursos" className="text-electric-blue underline underline-offset-2 hover:no-underline">
              Leé nuestras guías sobre licencias
            </Link>
          </p>

          <p className="mt-4 max-w-3xl text-xs text-slate-gray dark:text-gray-500 leading-relaxed">
            Esta página explica conceptos generales y no es asesoramiento legal.
            No reemplaza el consejo de un abogado o de un agente de propiedad
            intelectual.
          </p>
        </section>
      </div>
    </div>
  );
}
