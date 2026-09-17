import type { AssetCategory } from "@/types";

/**
 * Categorías con URL propia (`/assets/<slug>`). Las que no están acá siguen
 * con `?category=`, que es `noindex`.
 *
 * Sin "use client": lo importan Server Components y `catalog.ts`.
 */
export interface CategoryLanding {
  slug: string;
  category: AssetCategory;
  /** Anchor text de los links internos. */
  linkLabel: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  filtersHeading: string;
  howToHeading: string;
  sections: { heading: string; paragraphs: string[] }[];
  guide?: { href: string; label: string };
}

export const CATEGORY_LANDINGS: CategoryLanding[] = [
  {
    slug: "software",
    category: "software",
    linkLabel: "Licencias de software",
    title: "Comprar licencia de software",
    description:
      "Comprá una licencia de software a su titular: aplicaciones, sistemas y código para tu negocio, con licencia exclusiva, no exclusiva o temporal.",
    h1: "Comprar licencia de software para tu emprendimiento",
    intro: [
      "Comprar una licencia de software te permite usar una aplicación, un sistema o un código que otra persona desarrolló, sin construirlo desde cero. Puede tratarse de sistemas de gestión, aplicaciones, plugins, integraciones o código reutilizable.",
      "Cada ficha indica el tipo de licencia, el precio o si es a negociar, el territorio, la duración y los usos permitidos. Cuando encontrás lo que buscás, le mandás una solicitud al titular y acuerdan las condiciones entre ustedes. Da Vinci Inventa no procesa el pago ni es parte del contrato, así que revisá bien los usos permitidos antes de cerrar.",
      "Si todavía no sabés qué tipo de licencia necesitás, más abajo te contamos las diferencias y en qué casos conviene cada una.",
    ],
    filtersHeading: "Filtrá licencias de software",
    guide: { href: "/recursos/como-monetizar-un-software", label: "Guía: cómo monetizar un software" },
    howToHeading: "Cómo comprar una licencia de software",
    sections: [
      {
        heading: "Licencias de software para revender",
        paragraphs: [
          "Revender o redistribuir un software solo es posible si la licencia lo permite de forma expresa. Revisá en la ficha los usos permitidos y, si tu idea es revender, planteáselo al titular en la solicitud.",
          "Ese permiso suele quedar escrito en el acuerdo como derecho de sublicencia o de redistribución. Si tenés dudas sobre cómo redactarlo, consultá con un abogado.",
        ],
      },
      {
        heading: "¿Qué tipo de licencia de software te conviene?",
        paragraphs: [
          "Una licencia exclusiva te asegura que nadie más use ese software en las condiciones acordadas. Una no exclusiva permite que otras personas también lo usen. Una temporal te da acceso por un plazo definido, útil para probarlo o para un proyecto con fecha de fin.",
        ],
      },
    ],
  },
  {
    slug: "marcas",
    category: "brand",
    linkLabel: "Licencias de marcas",
    title: "Licenciar marca para tu negocio",
    description:
      "Licenciá una marca y su identidad visual para usarla en tu negocio sin comprarla. Encontrá marcas que sus titulares ofrecen con licencia en Argentina.",
    h1: "Licenciar una marca para tu negocio",
    intro: [
      "Licenciar una marca es obtener permiso de su titular para usar el nombre y la identidad visual en tu negocio, sin que la marca pase a ser tuya. Es una forma de arrancar con una identidad que ya tiene trabajo encima.",
      "Cada ficha indica qué incluye la licencia, en qué territorio y por cuánto tiempo, y qué usos permite el titular. Le mandás tu solicitud desde la ficha y acuerdan las condiciones entre ustedes. Da Vinci Inventa pone en contacto a las partes, pero no verifica la titularidad de las marcas ni es parte del contrato.",
      "Más abajo te explicamos qué cambia cuando la marca está registrada y en qué se diferencia licenciar una marca de comprarla.",
    ],
    filtersHeading: "Filtrá marcas para licenciar",
    guide: { href: "/recursos/como-licenciar-una-marca", label: "Guía: cómo licenciar mi marca" },
    howToHeading: "Cómo licenciar una marca",
    sections: [
      {
        heading: "Licenciar una marca registrada",
        paragraphs: [
          "En Argentina, las marcas se registran en el INPI (Instituto Nacional de la Propiedad Industrial). Licenciar una marca registrada significa que su titular te autoriza a usarla en las condiciones que acuerden, sin transferirte la propiedad.",
          "Da Vinci Inventa no verifica si una marca está registrada ni a nombre de quién. Antes de cerrar, pedile al titular la documentación del registro y consultá con un agente de propiedad industrial o un abogado.",
        ],
      },
      {
        heading: "¿Buscás marcas en venta? Licenciar es otra opción",
        paragraphs: [
          "Comprar una marca implica que la titularidad pase a tu nombre. Licenciarla te permite usarla por un plazo, en un territorio o en un rubro, sin hacer esa inversión.",
          "Si más adelante te interesa comprarla, lo hablás directamente con el titular.",
        ],
      },
    ],
  },
  {
    slug: "disenos",
    category: "design",
    linkLabel: "Licencias de diseño",
    title: "Licenciar diseño: logos e ilustraciones",
    description:
      "Licenciá un diseño para tu marca o tu producto: logos, ilustraciones, plantillas y piezas gráficas que sus autores ofrecen para usar con licencia.",
    h1: "Licenciar un diseño para tu marca o tu producto",
    intro: [
      "Licenciar un diseño te permite usar una pieza gráfica que creó otra persona, con su permiso y en las condiciones que acuerden. Puede ser un logo, una ilustración, una plantilla, un patrón o cualquier otra pieza visual.",
      "Cada ficha indica el tipo de licencia, el precio o si es a negociar y los usos permitidos: no es lo mismo usar un diseño en redes que imprimirlo en productos para vender. Le mandás tu solicitud al autor desde la ficha y cierran el acuerdo entre ustedes.",
      "Antes de pedir la licencia, revisá los puntos que te dejamos más abajo para no llevarte sorpresas cuando uses el diseño.",
    ],
    filtersHeading: "Filtrá diseños para licenciar",
    howToHeading: "Cómo licenciar un diseño",
    sections: [
      {
        heading: "Qué revisar antes de licenciar un diseño",
        paragraphs: [
          "Mirá en qué medios podés usarlo (digital, impresión, productos para la venta), si la licencia es exclusiva y en qué territorio vale. También conviene acordar en qué formatos te entregan los archivos y si podés modificar el diseño.",
        ],
      },
      {
        heading: "¿Diseño exclusivo o no exclusivo?",
        paragraphs: [
          "Con una licencia exclusiva, nadie más puede usar ese diseño en las condiciones acordadas. Con una no exclusiva, el autor puede licenciarlo a otras personas, algo que importa si el diseño va a identificar tu marca.",
        ],
      },
    ],
  },
  {
    slug: "modelos-de-negocio",
    category: "business_model",
    linkLabel: "Modelos de negocio",
    title: "Modelos de negocio en venta",
    description:
      "¿Buscás modelos de negocio en venta? En Da Vinci Inventa se licencian: usás la forma de operar que creó otra persona y la replicás en tu negocio.",
    h1: "Modelos de negocio en venta: licenciá uno para tu emprendimiento",
    intro: [
      "Si buscás modelos de negocio en venta, en Da Vinci Inventa vas a encontrar modelos para licenciar. La diferencia importa: su creador no te lo vende, te autoriza a replicar su forma de operar en las condiciones que acuerden.",
      "Cada ficha describe el modelo, el tipo de licencia, el territorio, la duración y los usos permitidos. Le mandás tu solicitud al titular desde la ficha y negocian entre ustedes. Da Vinci Inventa no verifica los resultados de ningún modelo ni es parte del acuerdo.",
      "Más abajo te contamos por qué se licencian y qué puede incluir cada modelo, para que sepas qué preguntarle al titular.",
    ],
    filtersHeading: "Filtrá modelos de negocio",
    howToHeading: "Cómo licenciar un modelo de negocio",
    sections: [
      {
        heading: "Por qué los modelos de negocio se licencian y no se venden",
        paragraphs: [
          "Con una licencia, el creador conserva la titularidad del modelo y te da permiso para usarlo. Eso le permite licenciarlo a otras personas en otros territorios, y a vos te permite arrancar sin pagar por la propiedad completa.",
        ],
      },
      {
        heading: "Qué puede incluir un modelo de negocio con licencia",
        paragraphs: [
          "Depende de cada titular. Puede incluir procesos, manuales de operación, proveedores, capacitación o el uso de una marca. Revisá en la ficha qué ofrece y, si falta algo, preguntalo en la solicitud.",
        ],
      },
    ],
  },
];

export function landingForCategory(category: string): CategoryLanding | undefined {
  return CATEGORY_LANDINGS.find((l) => l.category === category);
}

export function landingForSlug(slug: string): CategoryLanding {
  const landing = CATEGORY_LANDINGS.find((l) => l.slug === slug);
  if (!landing) throw new Error(`Landing de categoría inexistente: ${slug}`);
  return landing;
}
