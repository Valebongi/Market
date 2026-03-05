import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Upload,
  MessageSquare,
  Handshake,
  CheckCircle,
  Code,
  Palette,
  Briefcase,
  FileText,
  Shield,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://davinci-inventa.com";

const DESCRIPTION =
  "La plataforma para intermediar activos intelectuales en Argentina. Conecta titulares con emprendedores para licenciar software, diseños, modelos de negocio y más.";

export const metadata: Metadata = {
  title: "Da Vinci Inventa – Marketplace de Licencias",
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

// Hero particles — CSS-only, no JS runtime
const HERO_PARTICLES: Array<{
  s: number; t: string; l: string; a: string; d: number; dl: number; o: number; em?: boolean;
}> = [
  { s: 2, t: "6%",  l: "8%",  a: "star-float",   d: 4.5, dl: 0.0, o: 0.28 },
  { s: 3, t: "4%",  l: "28%", a: "star-twinkle",  d: 3.2, dl: 0.8, o: 0.20 },
  { s: 2, t: "9%",  l: "55%", a: "star-float",    d: 5.8, dl: 1.5, o: 0.18 },
  { s: 3, t: "5%",  l: "75%", a: "star-twinkle",  d: 4.1, dl: 0.3, o: 0.22 },
  { s: 2, t: "11%", l: "90%", a: "star-float",    d: 6.3, dl: 2.1, o: 0.20 },
  { s: 2, t: "28%", l: "3%",  a: "star-twinkle",  d: 5.0, dl: 1.2, o: 0.20 },
  { s: 3, t: "47%", l: "5%",  a: "star-float",    d: 4.8, dl: 2.4, o: 0.15 },
  { s: 2, t: "65%", l: "2%",  a: "star-twinkle",  d: 3.7, dl: 0.6, o: 0.22 },
  { s: 3, t: "25%", l: "95%", a: "star-float",    d: 4.2, dl: 1.8, o: 0.20 },
  { s: 2, t: "43%", l: "97%", a: "star-twinkle",  d: 5.5, dl: 0.4, o: 0.22 },
  { s: 2, t: "60%", l: "93%", a: "star-float",    d: 3.9, dl: 2.7, o: 0.18 },
  { s: 3, t: "75%", l: "96%", a: "star-twinkle",  d: 6.1, dl: 1.0, o: 0.15 },
  { s: 2, t: "82%", l: "15%", a: "star-float",    d: 4.6, dl: 0.7, o: 0.18 },
  { s: 3, t: "88%", l: "40%", a: "star-twinkle",  d: 3.5, dl: 2.9, o: 0.15 },
  { s: 2, t: "80%", l: "62%", a: "star-float",    d: 5.2, dl: 1.6, o: 0.18 },
  { s: 2, t: "86%", l: "83%", a: "star-twinkle",  d: 4.3, dl: 0.2, o: 0.15 },
  { s: 2, t: "18%", l: "18%", a: "star-float",    d: 7.2, dl: 3.1, o: 0.10 },
  { s: 2, t: "35%", l: "82%", a: "star-twinkle",  d: 4.9, dl: 2.0, o: 0.10 },
  { s: 3, t: "52%", l: "11%", a: "star-float",    d: 5.6, dl: 1.4, o: 0.09 },
  { s: 2, t: "22%", l: "88%", a: "star-twinkle",  d: 3.8, dl: 0.9, o: 0.12 },
  { s: 3, t: "16%", l: "72%", a: "star-twinkle",  d: 4.0, dl: 1.1, o: 0.55, em: true },
  { s: 4, t: "68%", l: "20%", a: "star-float",    d: 5.4, dl: 2.3, o: 0.45, em: true },
  { s: 3, t: "38%", l: "92%", a: "star-twinkle",  d: 3.6, dl: 0.5, o: 0.50, em: true },
  { s: 3, t: "78%", l: "58%", a: "star-float",    d: 6.0, dl: 1.7, o: 0.40, em: true },
];

export default async function HomePage() {
  const trustStats = [
    { value: "120+", label: "Activos licenciados" },
    { value: "350+", label: "Emprendedores activos" },
    { value: "40+",  label: "Titulares registrados" },
  ];

  const steps = [
    {
      number: "01",
      icon: <Upload className="h-6 w-6" />,
      title: "Publicá tu activo",
      description: "Registrá tu activo intelectual con documentación detallada y condiciones de licencia.",
      color: "bg-blue-50 dark:bg-blue-950/40 text-electric-blue dark:text-blue-400",
    },
    {
      number: "02",
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Negociá directamente",
      description: "Conectá con emprendedores interesados y cerrá acuerdos a través de nuestra plataforma.",
      color: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
    },
    {
      number: "03",
      icon: <Handshake className="h-6 w-6" />,
      title: "Cerrá el trato",
      description: "Formalizá el acuerdo y comenzá a generar ingresos por tus activos intelectuales.",
      color: "bg-emerald-50 dark:bg-emerald-950/40 text-deep-emerald dark:text-emerald-400",
    },
  ];

  const categories = [
    {
      icon: <Code className="h-6 w-6" />,
      label: "Software & Apps",
      count: 38,
      color: "bg-blue-50 dark:bg-blue-950/40 text-electric-blue dark:text-blue-400",
      slug: "software",
    },
    {
      icon: <Palette className="h-6 w-6" />,
      label: "Diseño & Marca",
      count: 24,
      color: "bg-indigo-50 dark:bg-indigo-950/40 text-soft-indigo dark:text-indigo-400",
      slug: "design",
    },
    {
      icon: <Briefcase className="h-6 w-6" />,
      label: "Modelos de Negocio",
      count: 31,
      color: "bg-emerald-50 dark:bg-emerald-950/40 text-deep-emerald dark:text-emerald-400",
      slug: "business_model",
    },
    {
      icon: <FileText className="h-6 w-6" />,
      label: "Contenido & Medios",
      count: 27,
      color: "bg-amber-50 dark:bg-amber-950/40 text-warm-amber dark:text-amber-400",
      slug: "content",
    },
  ];

  const ownerBenefits = [
    "Monetizá activos que ya creaste",
    "Control total sobre las condiciones de licencia",
    "Alcanzá emprendedores en todo el país",
    "Panel de gestión profesional",
    "Soporte legal incluido",
  ];

  const entrepreneurBenefits = [
    "Accedé a activos probados y listos para usar",
    "Ahorrá tiempo y recursos de desarrollo",
    "Condiciones flexibles de licenciamiento",
    "Catálogo verificado y curado",
    "Soporte dedicado para emprendedores",
  ];

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

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-midnight-blue dot-pattern">
        <div className="absolute inset-0 hero-overlay" />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {HERO_PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${p.s}px`,
                height: `${p.s}px`,
                top: p.t,
                left: p.l,
                opacity: p.o,
                backgroundColor: p.em ? "rgb(52,211,153)" : "white",
                animation: `${p.a} ${p.d}s ease-in-out infinite ${p.dl}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 container-market py-24 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-white/90 tracking-wide">
                La plataforma de licencias intelectuales de Argentina
              </span>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
              Conectá ideas
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-300 to-emerald-400">
                con oportunidades
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
              El marketplace argentino donde titulares de activos intelectuales y emprendedores se encuentran para hacer negocios.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/assets">
                <Button
                  size="lg"
                  variant="success"
                  icon={<ArrowRight className="h-5 w-5" />}
                  iconPosition="right"
                >
                  Explorar Activos
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-white border border-white/30 hover:bg-white/10"
                >
                  Publicar mi Activo
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center divide-y sm:divide-y-0 sm:divide-x divide-white/15">
              {trustStats.map((stat) => (
                <div key={stat.label} className="text-center px-8 py-4 sm:py-0">
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-white/50 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-[#0d1117] to-transparent" />
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="py-24 bg-white dark:bg-[#0d1117]">
        <div className="container-market">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-carbon-gray dark:text-white">Cómo funciona</h2>
            <p className="mt-4 text-lg text-slate-gray dark:text-gray-400 max-w-xl mx-auto">
              Tres pasos simples para conectar titulares y emprendedores.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="hidden md:block absolute top-10 left-[60%] w-full h-px bg-fog-gray dark:bg-gray-700 -z-10" />
                <div className="flex flex-col items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${step.color}`}>
                      {step.icon}
                    </div>
                    <span className="text-3xl font-bold text-fog-gray dark:text-gray-600 leading-none">
                      {step.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-carbon-gray dark:text-gray-100">{step.title}</h3>
                    <p className="mt-2 text-base text-slate-gray dark:text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="py-24 bg-snow-gray dark:bg-gray-900/60">
        <div className="container-market">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-carbon-gray dark:text-white">Explorá por categoría</h2>
            <p className="mt-4 text-lg text-slate-gray dark:text-gray-400">¿Qué tipo de activo estás buscando?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/assets?category=${cat.slug}`}
                className="group bg-white dark:bg-gray-800 border border-fog-gray dark:border-white/10 rounded-xl p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-medium hover:border-blue-200 dark:hover:border-blue-500/30"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cat.color}`}>
                  {cat.icon}
                </div>
                <h3 className="font-semibold text-carbon-gray dark:text-gray-100 group-hover:text-electric-blue dark:group-hover:text-blue-400 transition-colors">
                  {cat.label}
                </h3>
                <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">
                  {cat.count} activos disponibles
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/assets">
              <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                Ver todos los activos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PARA TITULARES / PARA EMPRENDEDORES */}
      <section className="py-24 bg-white dark:bg-[#0d1117]">
        <div className="container-market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Para Titulares */}
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-electric-blue dark:text-blue-400 mb-6">
                <Upload className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-bold text-carbon-gray dark:text-white">Para Titulares de Activos</h2>
              <p className="mt-4 text-base text-slate-gray dark:text-gray-400 leading-relaxed">
                Monetizá tus creaciones intelectuales llicenciándolas a emprendedores que las necesitan.
              </p>
              <ul className="mt-6 space-y-3">
                {ownerBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-deep-emerald dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-base text-carbon-gray dark:text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/register?role=owner">
                  <Button icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                    Publicar mi activo
                  </Button>
                </Link>
              </div>
            </div>

            {/* Para Emprendedores */}
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-deep-emerald dark:text-emerald-400 mb-6">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-bold text-carbon-gray dark:text-white">Para Emprendedores</h2>
              <p className="mt-4 text-base text-slate-gray dark:text-gray-400 leading-relaxed">
                Encontrá activos intelectuales listos para impulsar tu proyecto.
              </p>
              <ul className="mt-6 space-y-3">
                {entrepreneurBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-deep-emerald dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-base text-carbon-gray dark:text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/assets">
                  <Button variant="secondary" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                    Explorar catálogo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / CTA FINAL */}
      <section className="relative py-24 bg-midnight-blue dot-pattern overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-midnight-blue/95 via-midnight-blue/90 to-emerald-900/30" />
        <div className="relative z-10 container-market text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium text-white/60">Plataforma segura y transparente</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white max-w-2xl mx-auto leading-tight">
            ¿Listo para conectar ideas con oportunidades?
          </h2>
          <p className="mt-6 text-lg text-white/60 max-w-xl mx-auto">Uníte a la comunidad de innovadores argentinos.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" variant="success">Crear mi cuenta</Button>
            </Link>
            <Link href="/assets">
              <Button size="lg" variant="ghost" className="text-white border border-white/30 hover:bg-white/10">
                Ver activos disponibles
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
