import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { serializeJsonLd } from "@/lib/security";
import { SITE_URL } from "@/lib/site";
import { GUIDES, guideBySlug, type GuideBlock } from "../_content/guides";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  const url = `${SITE_URL}/recursos/${guide.slug}`;

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${guide.title} | Da Vinci Inventa`,
      description: guide.description,
      url,
      type: "article",
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
      images: [{ url: "/Logo DaVinci.png", width: 512, height: 512, alt: "Da Vinci Inventa" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${guide.title} | Da Vinci Inventa`,
      description: guide.description,
      images: ["/Logo DaVinci.png"],
    },
  };
}

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/** `[texto](/ruta)` -> <Link>. */
function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    parts.push(text.slice(last, m.index));
    parts.push(
      <Link key={m.index} href={m[2]} className="text-electric-blue underline underline-offset-2 hover:no-underline">
        {m[1]}
      </Link>,
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

const plain = (text: string) => text.replace(LINK, "$1");

const TEXT = "text-base text-slate-gray dark:text-gray-400 leading-relaxed";

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "p":
      return <p className={`mt-4 ${TEXT}`}><RichText text={block.text} /></p>;
    case "list":
      return (
        <ul className={`mt-4 space-y-2 list-disc pl-5 ${TEXT}`}>
          {block.items.map((item) => <li key={item}><RichText text={item} /></li>)}
        </ul>
      );
    case "steps":
      return (
        <ol className={`mt-4 space-y-3 list-decimal pl-5 marker:font-semibold marker:text-carbon-gray dark:marker:text-gray-200 ${TEXT}`}>
          {block.items.map((s) => (
            <li key={s.title}>
              <span className="font-semibold text-carbon-gray dark:text-gray-200">{s.title}</span>{" "}
              <RichText text={s.text} />
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="mt-6 overflow-x-auto rounded-xl border border-fog-gray dark:border-white/10">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{block.caption}</caption>
            <thead className="bg-snow-gray dark:bg-white/5 text-carbon-gray dark:text-gray-100">
              <tr>
                {block.head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-fog-gray dark:divide-white/10 text-slate-gray dark:text-gray-400">
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row" className="px-4 py-3 font-medium text-carbon-gray dark:text-gray-200 align-top">{cell}</th>
                    ) : (
                      <td key={i} className="px-4 py-3 align-top">{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

const H2 = "text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100";

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function GuidePage({ params }: Props) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();

  const url = `${SITE_URL}/recursos/${guide.slug}`;
  const organization = {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Da Vinci Inventa",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/Logo%20DaVinci.png` },
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.h1,
    description: guide.description,
    inLanguage: "es-AR",
    mainEntityOfPage: url,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    author: organization,
    publisher: organization,
  };
  // El texto del schema tiene que coincidir con el visible (sin la sintaxis de links).
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: plain(f.a) },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Recursos", item: `${SITE_URL}/recursos` },
      { "@type": "ListItem", position: 3, name: guide.title, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      {[articleJsonLd, faqJsonLd, breadcrumbJsonLd].map((data) => (
        <script key={data["@type"]} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
      ))}

      <div className="border-b border-fog-gray dark:border-white/10 bg-gradient-to-b from-[#f0f9ff] to-white dark:from-[#0d1a2e] dark:to-[#0d1117]">
        <div className="container-market px-4 sm:px-6 py-12 sm:py-16">
          <nav aria-label="Migas de pan" className="mb-4 text-sm text-slate-gray dark:text-gray-400">
            <Link href="/recursos" className="hover:text-electric-blue hover:underline">Recursos</Link>
            <span aria-hidden="true"> / </span>
            <span className="text-carbon-gray dark:text-gray-200">{guide.title}</span>
          </nav>
          <h1 className="max-w-4xl text-4xl sm:text-5xl font-bold text-carbon-gray dark:text-white leading-tight font-display">
            {guide.h1}
          </h1>
          <p className="mt-4 text-sm text-slate-gray dark:text-gray-400">
            Actualizada el <time dateTime={guide.dateModified}>{formatDate(guide.dateModified)}</time>
          </p>
          {guide.intro.map((p) => (
            <p key={p} className="mt-4 max-w-3xl text-lg text-slate-gray dark:text-gray-400 leading-relaxed">
              <RichText text={p} />
            </p>
          ))}
        </div>
      </div>

      <div className="container-market px-4 sm:px-6 py-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="max-w-3xl space-y-12">
          {guide.sections.map((s) => (
            <section key={s.heading}>
              <h2 className={H2}>{s.heading}</h2>
              {s.blocks.map((b, i) => <Block key={i} block={b} />)}
            </section>
          ))}

          <section aria-labelledby="preguntas-frecuentes">
            <h2 id="preguntas-frecuentes" className={H2}>Preguntas frecuentes</h2>
            <dl className="mt-6 space-y-6">
              {guide.faqs.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold text-carbon-gray dark:text-gray-100">{f.q}</dt>
                  <dd className={`mt-2 ${TEXT}`}>{plain(f.a)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="text-sm text-slate-gray dark:text-gray-400 leading-relaxed border-t border-fog-gray dark:border-white/10 pt-6">
            Esta guía explica conceptos generales y no es asesoramiento legal.
            No reemplaza el consejo de un abogado o de un agente de propiedad
            intelectual.
          </p>
        </article>

        <aside className="lg:sticky lg:top-24 self-start space-y-6">
          <div className="rounded-2xl border border-fog-gray dark:border-white/10 p-6">
            <h2 className="font-semibold text-carbon-gray dark:text-gray-100">Seguí leyendo</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {guide.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="text-electric-blue hover:underline">{r.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-electric-blue/5 border border-electric-blue/20 p-6">
            <h2 className="font-semibold text-carbon-gray dark:text-gray-100">¿Tenés un activo para licenciar?</h2>
            <p className="mt-2 text-sm text-slate-gray dark:text-gray-400">
              Publicalo en Da Vinci Inventa y recibí solicitudes de emprendedores interesados.
            </p>
            <Link
              href="/register"
              className="mt-4 inline-flex items-center px-4 py-2 bg-electric-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Publicar mi activo
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
