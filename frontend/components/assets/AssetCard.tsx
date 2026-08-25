"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Flame, Bookmark,
  Code, Palette, Layers, Briefcase, FileText, Package, Rocket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, ASSET_TYPE_LABELS, LICENSE_TYPE_LABELS, formatNumber } from "@/lib/utils";
import { useSavedAssets } from "@/lib/saved-assets-context";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import type { Asset } from "@/types";

interface AssetCardProps {
  asset: Asset;
  className?: string;
}

// ── Category visual identity ─────────────────────────────────────────
interface CategoryStyle {
  border: string;
  imageBg: string;
  badge: string;
  iconBg: string;
  Icon: LucideIcon;
  priceAccent: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  software: {
    border: "border-l-blue-500",
    imageBg: "from-blue-100 to-blue-50 dark:from-blue-950/60 dark:to-blue-900/20",
    badge: "bg-blue-100/90 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/40",
    iconBg: "bg-blue-500",
    Icon: Code,
    priceAccent: "text-blue-700 dark:text-blue-400",
  },
  design: {
    border: "border-l-violet-500",
    imageBg: "from-violet-100 to-violet-50 dark:from-violet-950/60 dark:to-violet-900/20",
    badge: "bg-violet-100/90 text-violet-700 border border-violet-200 dark:bg-violet-950/80 dark:text-violet-300 dark:border-violet-800/40",
    iconBg: "bg-violet-500",
    Icon: Palette,
    priceAccent: "text-violet-700 dark:text-violet-400",
  },
  brand: {
    border: "border-l-pink-500",
    imageBg: "from-pink-100 to-pink-50 dark:from-pink-950/60 dark:to-pink-900/20",
    badge: "bg-pink-100/90 text-pink-700 border border-pink-200 dark:bg-pink-950/80 dark:text-pink-300 dark:border-pink-800/40",
    iconBg: "bg-pink-500",
    Icon: Layers,
    priceAccent: "text-pink-700 dark:text-pink-400",
  },
  business_model: {
    border: "border-l-emerald-500",
    imageBg: "from-emerald-100 to-emerald-50 dark:from-emerald-950/60 dark:to-emerald-900/20",
    badge: "bg-emerald-100/90 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/40",
    iconBg: "bg-emerald-500",
    Icon: Briefcase,
    priceAccent: "text-emerald-700 dark:text-emerald-400",
  },
  content: {
    border: "border-l-amber-500",
    imageBg: "from-amber-100 to-amber-50 dark:from-amber-950/60 dark:to-amber-900/20",
    badge: "bg-amber-100/90 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/40",
    iconBg: "bg-amber-500",
    Icon: FileText,
    priceAccent: "text-amber-700 dark:text-amber-400",
  },
  project: {
    border: "border-l-cyan-500",
    imageBg: "from-cyan-100 to-cyan-50 dark:from-cyan-950/60 dark:to-cyan-900/20",
    badge: "bg-cyan-100/90 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800/40",
    iconBg: "bg-cyan-500",
    Icon: Rocket,
    priceAccent: "text-cyan-700 dark:text-cyan-400",
  },
  other: {
    border: "border-l-slate-400",
    imageBg: "from-slate-100 to-slate-50 dark:from-slate-800/60 dark:to-slate-700/20",
    badge: "bg-slate-100/90 text-slate-600 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/40",
    iconBg: "bg-slate-500",
    Icon: Package,
    priceAccent: "text-slate-700 dark:text-slate-300",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────
function getPriceDisplay(asset: Asset) {
  // `free` va PRIMERO: su `priceFixed` es 0, que es falsy, así que cualquier
  // chequeo por `!priceFixed` lo capturaría antes y lo mostraría "A consultar".
  if (asset.priceType === "free") {
    return { label: "Gratuito", type: "free" as const };
  }
  if (asset.priceType === "negotiable" || !asset.priceFixed) {
    return { label: "A consultar", type: "negotiable" as const };
  }
  return {
    label: `${asset.priceCurrency ?? "USD"} ${Number(asset.priceFixed).toLocaleString("es-AR")}`,
    type: "fixed" as const,
  };
}

function getPopularitySignal(asset: Asset) {
  if (asset.requestCount >= 10) return { label: "Muy solicitado", cls: "bg-red-50/90 text-soft-coral dark:bg-red-950/80 dark:text-red-400" };
  if (asset.requestCount >= 5)  return { label: "Popular",        cls: "bg-amber-50/90 text-warm-amber dark:bg-amber-950/80 dark:text-amber-400" };
  if (asset.viewCount >= 200)   return { label: "Tendencia",      cls: "bg-blue-50/90 text-electric-blue dark:bg-blue-950/80 dark:text-blue-400" };
  return null;
}

// ── Component ────────────────────────────────────────────────────────
export default function AssetCard({ asset, className }: AssetCardProps) {
  const style = CATEGORY_STYLES[asset.assetType] ?? CATEGORY_STYLES.other;
  const { Icon } = style;
  const categoryLabel = ASSET_TYPE_LABELS[asset.assetType] || asset.assetType;
  const licenseLabel = LICENSE_TYPE_LABELS[asset.licenseType] || asset.licenseType;
  const price = getPriceDisplay(asset);
  const popularity = getPopularitySignal(asset);
  const { isSaved, toggleSave } = useSavedAssets();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const saved = isSaved(asset.id);
  const tags: string[] = (asset.tags as string[] | undefined) ?? [];

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?returnTo=/assets/${asset.id}`);
      return;
    }
    toggleSave(asset.id);
  }

  return (
    <Link href={`/assets/${asset.id}`} className={cn("group block", className)}>
      <div className={cn(
        "relative flex flex-col h-full",
        "bg-white dark:bg-gray-900",
        "border border-fog-gray dark:border-white/10 rounded-xl overflow-hidden",
        "shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.13)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.45)]",
        "transition-all duration-200 hover:-translate-y-0.5"
      )}>

        {/* ── Cover image ── */}
        <div className="relative w-full aspect-[16/9] overflow-hidden shrink-0">
          {asset.coverImageUrl ? (
            <Image
              src={asset.coverImageUrl}
              alt={asset.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              style.imageBg
            )}>
              <Icon className="h-14 w-14 opacity-20 text-gray-500 dark:text-gray-300" />
            </div>
          )}

          {/* Floating badges on image */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
            <span className={cn(
              "text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm",
              style.badge
            )}>
              {categoryLabel}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {popularity && (
                <span className={cn(
                  "hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm",
                  popularity.cls
                )}>
                  <Flame className="h-2.5 w-2.5" />
                  {popularity.label}
                </span>
              )}
              <button
                onClick={handleSave}
                aria-label={saved ? "Quitar de guardados" : "Guardar activo"}
                className={cn(
                  "p-1.5 rounded-lg backdrop-blur-sm transition-colors",
                  saved
                    ? "text-electric-blue bg-white/90 dark:bg-white/20"
                    : "text-white bg-black/25 hover:bg-white/90 hover:text-electric-blue"
                )}
              >
                <Bookmark className={cn("h-4 w-4", saved && "fill-current text-electric-blue")} />
              </button>
            </div>
          </div>

          {/* Stats bar overlay at bottom of image */}
          <div className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-gradient-to-t from-black/40 to-transparent flex items-center gap-3 text-white/90">
            <span className="text-[11px] font-medium">{formatNumber(asset.viewCount)} vistas</span>
            {asset.requestCount > 0 && (
              <span className="text-[11px] font-medium">· {formatNumber(asset.requestCount)} solicitudes</span>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className={cn(
          "flex flex-col flex-1 p-4 border-l-4",
          style.border
        )}>

          {/* Title */}
          <h3 className="font-bold text-[15px] text-carbon-gray dark:text-gray-100 line-clamp-1 leading-snug group-hover:text-electric-blue dark:group-hover:text-blue-400 transition-colors">
            {asset.title}
          </h3>

          {/* Description */}
          <p className="mt-1.5 text-[13px] text-slate-gray dark:text-gray-400 line-clamp-2 leading-relaxed flex-1">
            {asset.description}
          </p>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium bg-snow-gray dark:bg-white/5 border border-fog-gray dark:border-white/10 text-slate-gray dark:text-gray-400 px-2 py-0.5 rounded-md"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="text-[11px] text-slate-gray/60 dark:text-gray-500 px-1 py-0.5">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Footer: price + CTA */}
          <div className="mt-3 pt-3 border-t border-fog-gray/80 dark:border-white/10 flex items-center justify-between gap-2">
            <div>
              <p className={cn(
                "font-bold text-base leading-none",
                price.type === "free"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : price.type === "negotiable"
                  ? "text-slate-gray dark:text-gray-400 text-sm"
                  : style.priceAccent
              )}>
                {price.label}
              </p>
              <p className="text-[11px] text-slate-gray/70 dark:text-gray-500 mt-0.5">{licenseLabel}</p>
            </div>

            <span className="shrink-0 h-8 px-3 rounded-lg text-sm font-semibold border-2 border-electric-blue text-electric-blue group-hover:bg-electric-blue group-hover:text-white transition-all duration-150 inline-flex items-center">
              Ver más →
            </span>
          </div>
        </div>

      </div>
    </Link>
  );
}
