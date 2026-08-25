import type { Metadata } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://vinciinventa.com";

export const metadata: Metadata = {
  title: "Explorar Activos",
  description:
    "Navegá el catálogo de licencias disponibles: software, diseños, modelos de negocio, contenido y más. Encontrá el activo intelectual perfecto para tu proyecto.",
  keywords: [
    "explorar licencias",
    "activos intelectuales",
    "marketplace licencias",
    "comprar licencias software",
    "licencias diseño",
  ],
  alternates: {
    canonical: `${SITE_URL}/assets`,
  },
  openGraph: {
    title: "Explorar Activos | Da Vinci Inventa",
    description:
      "Navegá el catálogo de licencias disponibles: software, diseños, modelos de negocio y más.",
    url: `${SITE_URL}/assets`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explorar Activos | Da Vinci Inventa",
    description:
      "Navegá el catálogo de licencias disponibles: software, diseños, modelos de negocio y más.",
  },
};

export default function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
