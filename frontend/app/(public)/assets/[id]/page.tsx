import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Tag,
  Globe,
  Clock,
  Eye,
  MessageSquare,
  ChevronRight,
  Shield,
  CheckCircle,
  ExternalLink,
  TrendingUp,
  Flame,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { ASSET_TYPE_LABELS, LICENSE_TYPE_LABELS, formatNumber, formatRelativeTime } from "@/lib/utils";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";
import AssetDetailSidebar from "@/components/assets/AssetDetailSidebar";
import AssetOwnerInline from "@/components/assets/AssetOwnerInline";
import type { Metadata } from "next";

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://davinci-inventa.com";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const raw = await assetsApi.get(id);
    const asset = mapAsset(raw);
    const description = asset.description.slice(0, 155);
    const url = `${SITE_URL}/assets/${id}`;
    const imageUrl = asset.previewUrls?.[0] ?? `${SITE_URL}/Logo DaVinci.png`;
    return {
      title: asset.title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: asset.title,
        description,
        url,
        type: "website",
        siteName: "Da Vinci Inventa",
        images: [{ url: imageUrl, alt: asset.title }],
      },
      twitter: {
        card: "summary_large_image",
        title: asset.title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: "Activo no encontrado",
      robots: { index: false, follow: false },
    };
  }
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;

  let raw: any;
  try {
    raw = await assetsApi.get(id);
  } catch {
    notFound();
  }

  const asset = mapAsset(raw);

  const priceDisplay =
    asset.priceType === "fixed" && asset.priceFixed != null && asset.priceFixed > 0
      ? `USD ${asset.priceFixed.toLocaleString()}`
      : "A consultar";

  const licenseDetails = [
    { label: "Tipo de Licencia", value: LICENSE_TYPE_LABELS[asset.licenseType as keyof typeof LICENSE_TYPE_LABELS] || asset.licenseType },
    { label: "Duración", value: asset.duration || "Indefinida" },
    { label: "Territorio", value: asset.territory },
    { label: "Precio Estimado", value: priceDisplay },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: asset.title,
    description: asset.description.slice(0, 500),
    url: `${SITE_URL}/assets/${asset.id}`,
    image: asset.previewUrls?.[0] ?? `${SITE_URL}/Logo DaVinci.png`,
    brand: { "@type": "Organization", name: "Da Vinci Inventa" },
    offers: {
      "@type": "Offer",
      priceCurrency: asset.priceCurrency || "USD",
      price:
        asset.priceType === "fixed" && asset.priceFixed != null
          ? asset.priceFixed
          : undefined,
      priceSpecification:
        asset.priceType === "negotiable"
          ? { "@type": "PriceSpecification", description: "A consultar" }
          : undefined,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Da Vinci Inventa" },
    },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d1117]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <div className="bg-snow-gray dark:bg-gray-900 border-b border-fog-gray dark:border-white/10">
        <div className="container-wide py-3">
          <nav className="flex items-center gap-2 text-sm text-slate-gray dark:text-gray-400" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-electric-blue transition-colors">Inicio</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/assets" className="hover:text-electric-blue transition-colors">Explorar</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-carbon-gray dark:text-gray-200 font-medium truncate max-w-[200px]">{asset.title}</span>
          </nav>
        </div>
      </div>

      <div className="container-wide py-12">
        <div className="flex gap-12">
          {/* COLUMNA PRINCIPAL */}
          <div className="flex-1 min-w-0">
            {/* Hero del activo */}
            <div className="pb-8 border-b border-fog-gray dark:border-white/10">
              <Badge variant="primary">
                {ASSET_TYPE_LABELS[asset.assetType as keyof typeof ASSET_TYPE_LABELS] || asset.assetType}
              </Badge>

              <h1 className="mt-4 text-4xl font-bold text-carbon-gray dark:text-gray-100 leading-tight">
                {asset.title}
              </h1>

              {/* Metadata */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-gray dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4" />
                  {LICENSE_TYPE_LABELS[asset.licenseType as keyof typeof LICENSE_TYPE_LABELS] || asset.licenseType}
                </span>
                {asset.territory && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" />
                    {asset.territory}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatRelativeTime(asset.createdAt)}
                </span>
              </div>

              {/* Social proof row */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium ${
                  asset.viewCount >= 50
                    ? "bg-blue-50 dark:bg-blue-950/30 text-electric-blue dark:text-blue-400"
                    : "bg-snow-gray dark:bg-white/5 text-slate-gray dark:text-gray-400"
                }`}>
                  <Eye className="h-4 w-4" />
                  {formatNumber(asset.viewCount)} vistas
                </span>

                <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium ${
                  asset.requestCount >= 3
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-deep-emerald dark:text-emerald-400"
                    : "bg-snow-gray dark:bg-white/5 text-slate-gray dark:text-gray-400"
                }`}>
                  <MessageSquare className="h-4 w-4" />
                  {asset.requestCount === 1 ? "1 solicitud recibida" : `${formatNumber(asset.requestCount)} solicitudes recibidas`}
                </span>

                {asset.requestCount >= 5 && (
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-950/30 text-warm-amber dark:text-amber-400">
                    <Flame className="h-4 w-4" />
                    Activo popular
                  </span>
                )}

                {asset.requestCount >= 3 && asset.requestCount < 5 && (
                  <span className="text-sm text-slate-gray dark:text-gray-400 flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-deep-emerald" />
                    {asset.requestCount} personas ya solicitaron este activo
                  </span>
                )}
              </div>

              {/* Owner inline — client component fetches real name */}
              <AssetOwnerInline ownerId={asset.ownerId} />
            </div>

            {/* Media Preview Gallery */}
            {asset.previewUrls && asset.previewUrls.length > 0 && (
              <section className="py-8 border-b border-fog-gray dark:border-white/10">
                <h2 className="text-xl font-semibold text-carbon-gray dark:text-gray-100 mb-4">Vista Previa</h2>
                <div className="space-y-4">
                  {asset.previewUrls.map((url: string, i: number) => {
                    const ytId = getYouTubeId(url);
                    const vimeoId = getVimeoId(url);
                    if (ytId) {
                      return (
                        <div key={i} className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: "56.25%" }}>
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={`Preview ${i + 1}`}
                          />
                        </div>
                      );
                    }
                    if (vimeoId) {
                      return (
                        <div key={i} className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: "56.25%" }}>
                          <iframe
                            src={`https://player.vimeo.com/video/${vimeoId}`}
                            className="absolute inset-0 w-full h-full"
                            allowFullScreen
                            title={`Preview ${i + 1}`}
                          />
                        </div>
                      );
                    }
                    if (isImageUrl(url)) {
                      return (
                        <div key={i} className="rounded-xl overflow-hidden border border-fog-gray">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Vista previa ${i + 1}`}
                            className="w-full object-cover max-h-96"
                          />
                        </div>
                      );
                    }
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
                      >
                        <ExternalLink className="h-4 w-4 text-slate-gray dark:text-gray-400 group-hover:text-electric-blue" />
                        <span className="text-sm text-electric-blue truncate">{url}</span>
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Descripción */}
            <section className="py-8 border-b border-fog-gray dark:border-white/10">
              <h2 className="text-xl font-semibold text-carbon-gray dark:text-gray-100 mb-4">Descripción</h2>
              <div className="prose prose-slate dark:prose-invert max-w-none text-base text-carbon-gray dark:text-gray-300 leading-relaxed">
                {asset.description.split("\n\n").map((paragraph: string, i: number) => (
                  <p key={i} className="mb-4 last:mb-0 whitespace-pre-line">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {/* Detalles de Licencia */}
            <section className="py-8 border-b border-fog-gray dark:border-white/10">
              <h2 className="text-xl font-semibold text-carbon-gray dark:text-gray-100 mb-4">Condiciones de Licencia</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {licenseDetails.map((detail) => (
                  <div key={detail.label} className="py-3 border-b border-fog-gray dark:border-white/10 last:border-0">
                    <p className="text-xs font-medium text-slate-gray dark:text-gray-500 uppercase tracking-wide">{detail.label}</p>
                    <p className="mt-1 text-base font-medium text-carbon-gray dark:text-gray-200">{detail.value}</p>
                  </div>
                ))}
              </div>

              {/* Usos permitidos */}
              {asset.allowedUses && asset.allowedUses.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-carbon-gray dark:text-gray-200 mb-3">Usos Permitidos</p>
                  <div className="flex flex-wrap gap-2">
                    {asset.allowedUses.map((use: string) => (
                      <span key={use} className="flex items-center gap-1.5 text-sm text-deep-emerald dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {use}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Condiciones adicionales */}
              {asset.additionalConditions && (
                <div className="mt-6 p-4 bg-snow-gray dark:bg-gray-800 rounded-xl border border-fog-gray dark:border-white/10">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-slate-gray dark:text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-gray dark:text-gray-400 mb-1">Condiciones adicionales</p>
                      <p className="text-sm text-carbon-gray dark:text-gray-300">{asset.additionalConditions}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Links externos */}
            {asset.externalLinks && asset.externalLinks.length > 0 && (
              <section className="py-8 border-b border-fog-gray dark:border-white/10">
                <h2 className="text-xl font-semibold text-carbon-gray dark:text-gray-100 mb-4">Recursos Disponibles</h2>
                <div className="space-y-2">
                  {asset.externalLinks.map((link: string, i: number) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border border-fog-gray dark:border-white/10 rounded-lg hover:bg-snow-gray dark:hover:bg-white/5 hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
                    >
                      <ExternalLink className="h-4 w-4 text-slate-gray dark:text-gray-400 group-hover:text-electric-blue" />
                      <span className="text-sm text-electric-blue">{link}</span>
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-gray dark:text-gray-500 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Los recursos completos estarán disponibles tras el acuerdo de licencia.
                </p>
              </section>
            )}

            {/* Tags */}
            {asset.tags.length > 0 && (
              <section className="py-8 border-b border-fog-gray dark:border-white/10">
                <h2 className="text-xl font-semibold text-carbon-gray dark:text-gray-100 mb-4">Etiquetas</h2>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag: string) => (
                    <Link
                      key={tag}
                      href={`/assets?search=${tag}`}
                      className="px-3 py-1.5 text-sm bg-snow-gray dark:bg-white/5 border border-fog-gray dark:border-white/10 rounded-full text-carbon-gray dark:text-gray-300 hover:border-electric-blue hover:text-electric-blue transition-all"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* COLUMNA LATERAL — client component handles owner name + auth-aware buttons */}
          <div className="hidden lg:block w-80 shrink-0">
            <AssetDetailSidebar
              assetId={asset.id}
              ownerId={asset.ownerId}
              assetTitle={asset.title}
              priceDisplay={priceDisplay}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
