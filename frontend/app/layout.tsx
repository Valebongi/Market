import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import { SITE_URL } from "@/lib/site";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/analytics/GoogleTagManager";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-poppins",
});

const DESCRIPTION =
  "La plataforma para intermediar activos intelectuales en Argentina. Conecta titulares con emprendedores para licenciar software, diseños, modelos de negocio y más.";

// Vacío = no se rinde el meta; uno sin valor no verifica nada.
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Da Vinci Inventa – Marketplace de Licencias",
    template: "%s | Da Vinci Inventa",
  },
  description: DESCRIPTION,
  keywords: [
    "marketplace licencias",
    "propiedad intelectual Argentina",
    "licencias software",
    "licencias diseño",
    "activos intelectuales",
    "emprendedores",
    "intermediación intelectual",
    "Da Vinci Inventa",
  ],
  authors: [{ name: "Da Vinci Inventa", url: SITE_URL }],
  creator: "Da Vinci Inventa",
  publisher: "Da Vinci Inventa",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Da Vinci Inventa",
    title: "Da Vinci Inventa – Marketplace de Licencias",
    description: DESCRIPTION,
    images: [
      {
        url: "/Logo DaVinci.png",
        width: 512,
        height: 512,
        alt: "Da Vinci Inventa – Marketplace de Licencias",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Da Vinci Inventa – Marketplace de Licencias",
    description: DESCRIPTION,
    images: ["/Logo DaVinci.png"],
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
    : {}),
  // El PNG de 1024x1024 pesa 170 KiB y se servia crudo como favicon en cada
  // pagina. Sigue siendo el de Open Graph, que si necesita ser grande.
  icons: {
    icon: "/icon-32.png",
    apple: "/apple-icon-180.png",
  },
  // SIN `alternates.canonical` a proposito. Un canonical en el layout raiz lo
  // hereda toda pagina que no declare el suyo, y como el valor es SITE_URL, esa
  // pagina se autocanonicaliza a la home y no se indexa nunca. Cada pagina
  // publica declara el suyo; una nueva que se olvide queda sin canonical, que es
  // recuperable, en vez de apuntando a otra URL, que no lo es.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <GoogleTagManager />
      <body className="min-h-screen bg-white dark:bg-[#0d1117] text-carbon-gray dark:text-gray-100 antialiased transition-colors duration-200">
        <GoogleTagManagerNoScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
