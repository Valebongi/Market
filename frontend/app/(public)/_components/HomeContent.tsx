import Link from "next/link";
import type { AssetCategory } from "@/types";
import { ASSET_CATEGORIES } from "@/lib/asset-categories";
import { catalogHref } from "../assets/_components/catalog";
import { landingForCategory } from "../assets/_components/category-landings";
import SocialProof from "@/components/landing/SocialProof";

// Record y no objeto suelto: una categoría nueva sin descripción rompe el build.
const CATEGORY_DESCRIPTIONS: Record<AssetCategory, string> = {
  software: "Aplicaciones, sistemas y código para usar en tu negocio sin desarrollarlos desde cero.",
  design: "Logos, ilustraciones, plantillas y piezas gráficas para tu marca o tus productos.",
  business_model: "Formas de operar un negocio que su creador ofrece para que las repliques.",
  content: "Textos, cursos, videos y otros materiales digitales.",
  brand: "Marcas y su identidad visual, para usarlas en las condiciones que acuerden.",
  project: "Proyectos armados o en desarrollo que su titular ofrece para que otro los continúe.",
  other: "Cualquier activo intelectual que no entra en las categorías anteriores.",
};

const LICENSE_TYPES = [
  {
    name: "Licencia exclusiva",
    text: "Solo vos podés usar el activo en las condiciones acordadas. El titular no se lo licencia a nadie más mientras dure el acuerdo.",
  },
  {
    name: "Licencia no exclusiva",
    text: "El titular puede licenciar el mismo activo a varias personas a la vez.",
  },
  {
    name: "Licencia temporal",
    text: "El uso tiene un plazo definido. Cuando termina, se renueva o se deja de usar.",
  },
];

const USE_CASES = [
  {
    title: "Necesitás un software que ya existe",
    text: "En vez de desarrollarlo, licenciás uno que alguien ya construyó y lo sumás a tu emprendimiento.",
  },
  {
    title: "Lanzás un producto y buscás identidad",
    text: "Usás un diseño o una marca que ya tiene trabajo encima, con permiso de quien la creó.",
  },
  {
    title: "Querés replicar un modelo de negocio",
    text: "Licenciás la forma de operar que otra persona armó y la llevás a tu ciudad o a tu rubro.",
  },
  {
    title: "Creaste algo que no estás usando",
    text: "Lo publicás y se lo licenciás a quien le sirva, sin desprenderte de la titularidad.",
  },
];

const SECTION = "border-t border-fog-gray dark:border-white/10";
const H2 = "text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100";
const LEAD = "mt-3 text-base text-slate-gray dark:text-gray-400 max-w-3xl leading-relaxed";
const CARD = "rounded-2xl border border-fog-gray dark:border-white/10 p-6";
const CARD_TITLE = "text-lg font-semibold text-carbon-gray dark:text-gray-100";
const CARD_TEXT = "mt-2 text-sm text-slate-gray dark:text-gray-400 leading-relaxed";

export default function HomeContent() {
  return (
    <>
      <section aria-labelledby="tipos-de-licencia" className={SECTION}>
        <div className="container-market px-4 sm:px-6 py-12 sm:py-14">
          <h2 id="tipos-de-licencia" className={H2}>
            ¿Qué tipos de licencia podés acordar?
          </h2>
          <p className={LEAD}>
            En Da Vinci Inventa hay tres tipos de licencia: exclusiva, no
            exclusiva y temporal. Cada activo indica cuál ofrece su titular.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {LICENSE_TYPES.map((lt) => (
              <li key={lt.name} className={CARD}>
                <h3 className={CARD_TITLE}>{lt.name}</h3>
                <p className={CARD_TEXT}>{lt.text}</p>
              </li>
            ))}
          </ul>
          <p className={LEAD}>
            Además del tipo, el titular y quien licencia definen juntos el
            precio, la duración, el territorio y los usos permitidos.
          </p>
          <Link
            href="/como-funciona"
            className="mt-6 inline-block text-sm font-semibold text-electric-blue hover:underline"
          >
            Conocé cómo funciona cada tipo de licencia
          </Link>
        </div>
      </section>

      <section aria-labelledby="categorias" className={SECTION}>
        <div className="container-market px-4 sm:px-6 py-12 sm:py-14">
          <h2 id="categorias" className={H2}>
            ¿Qué activos intelectuales podés licenciar?
          </h2>
          <p className={LEAD}>
            El catálogo tiene siete categorías de activos intelectuales. Estas
            son y qué incluye cada una:
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ASSET_CATEGORIES.map((cat) => (
              <li key={cat.value}>
                <Link
                  href={catalogHref({ category: cat.value })}
                  className="block h-full rounded-2xl border border-fog-gray dark:border-white/10 p-5 hover:border-electric-blue transition-colors"
                >
                  <h3 className="font-semibold text-carbon-gray dark:text-gray-100">
                    {landingForCategory(cat.value)?.linkLabel ?? cat.label}
                  </h3>
                  <p className={CARD_TEXT}>{CATEGORY_DESCRIPTIONS[cat.value]}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="casos-de-uso" className={SECTION}>
        <div className="container-market px-4 sm:px-6 py-12 sm:py-14">
          <h2 id="casos-de-uso" className={H2}>
            ¿Para qué te sirve licenciar un activo intelectual?
          </h2>
          <p className={LEAD}>
            Licenciar te permite usar algo que otra persona creó sin comprarlo
            ni hacerlo desde cero. Y si sos titular, te permite generar ingresos
            con lo que ya hiciste. Algunos ejemplos:
          </p>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {USE_CASES.map((uc) => (
              <li key={uc.title} className={CARD}>
                <h3 className={CARD_TITLE}>{uc.title}</h3>
                <p className={CARD_TEXT}>{uc.text}</p>
              </li>
            ))}
          </ul>
          <p className={LEAD}>
            En todos los casos las condiciones las acuerdan las partes. Da
            Vinci Inventa no interviene en el contrato ni en el pago.
          </p>
        </div>
      </section>

      <SocialProof />
    </>
  );
}
