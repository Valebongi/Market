import Link from "next/link";

export interface SocialProofItem {
  title: string;
  text: string;
  /** Link opcional al activo o al caso. */
  href?: string;
}

// TODO(owner): cargar casos de éxito o activos licenciados reales. Vacío = la sección no se muestra.
export const SOCIAL_PROOF_ITEMS: SocialProofItem[] = [];

export default function SocialProof({ items = SOCIAL_PROOF_ITEMS }: { items?: SocialProofItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="casos-de-exito" className="border-t border-fog-gray dark:border-white/10">
      <div className="container-market px-4 sm:px-6 py-12 sm:py-14">
        <h2 id="casos-de-exito" className="text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100">
          Activos que ya se licenciaron
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.title} className="rounded-2xl border border-fog-gray dark:border-white/10 p-6">
              <h3 className="text-lg font-semibold text-carbon-gray dark:text-gray-100">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-gray dark:text-gray-400 leading-relaxed">{item.text}</p>
              {item.href && (
                <Link href={item.href} className="mt-4 inline-block text-sm font-semibold text-electric-blue hover:underline">
                  Ver más
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
