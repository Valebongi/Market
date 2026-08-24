"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck, ArrowRight, ExternalLink,
  Code, Briefcase, Palette, Package,
  Eye, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { assetsService as assetsApi, mapAsset } from "@/services/assets.service";
import { cn, formatNumber } from "@/lib/utils";
import type { Asset } from "@/types";

const DIGITAL_AXIOS_OWNER = "aa000000-0000-0000-0000-digitalaxios1";

// Per-category accent for featured cards
const CAT_STYLE: Record<string, { border: string; icon: string; Icon: LucideIcon }> = {
  software:       { border: "border-electric-blue",  icon: "bg-electric-blue",  Icon: Code },
  design:         { border: "border-violet-500",      icon: "bg-violet-500",      Icon: Palette },
  business_model: { border: "border-emerald-500",     icon: "bg-emerald-500",     Icon: Briefcase },
  other:          { border: "border-slate-400",       icon: "bg-slate-400",       Icon: Package },
};

function FeaturedCard({ asset }: { asset: Asset }) {
  const cat = CAT_STYLE[asset.assetType] ?? CAT_STYLE.other;
  const { Icon } = cat;

  const priceLabel =
    asset.priceType === "negotiable" || !asset.priceFixed
      ? "A consultar"
      : `USD ${Number(asset.priceFixed).toLocaleString("es-AR")}`;

  return (
    <Link href={`/assets/${asset.id}`} className="group block h-full">
      <div className={cn(
        "relative bg-white rounded-xl border-l-4 overflow-hidden h-full flex flex-col",
        "shadow-sm group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200",
        cat.border
      )}>

        {/* Cover image — compact fixed height */}
        <div className="relative w-full h-28 overflow-hidden shrink-0">
          {asset.coverImageUrl ? (
            <Image
              src={asset.coverImageUrl}
              alt={asset.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <Icon className="h-8 w-8 opacity-20 text-gray-400" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
            <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-md shadow-sm shrink-0", cat.icon)}>
              <Icon className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="inline-flex items-center gap-1 bg-electric-blue/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              <BadgeCheck className="h-2.5 w-2.5" />
              OFICIAL
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1">
          <h3 className="font-semibold text-[13px] text-carbon-gray group-hover:text-electric-blue transition-colors line-clamp-1 leading-snug">
            {asset.title}
          </h3>

          <p className="mt-1 text-[12px] text-slate-gray line-clamp-2 leading-relaxed flex-1">
            {asset.description}
          </p>

          {/* Footer */}
          <div className="mt-2.5 pt-2.5 border-t border-fog-gray flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-sm text-carbon-gray leading-none">{priceLabel}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-gray">
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {formatNumber(asset.viewCount)}</span>
                <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> {formatNumber(asset.requestCount)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-electric-blue group-hover:gap-1.5 transition-all shrink-0">
              Ver <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedByDigitalAxios() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assetsApi
      .list({ ownerId: DIGITAL_AXIOS_OWNER, status: "published", limit: 4, sortBy: "viewCount", sortOrder: "desc" })
      .then((res) => setAssets((res.data || []).map(mapAsset) as Asset[]))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && assets.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-y border-emerald-200 dark:border-emerald-800/40">
      {/* Emerald background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-50 dark:from-emerald-950/70 dark:via-teal-950/40 dark:to-[#0d1117]" />
      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-[0.10] dark:opacity-[0.15]" style={{ backgroundImage: "radial-gradient(circle, #059669 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      {/* Glow orbs */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-400/35 rounded-full blur-[100px] pointer-events-none dark:bg-emerald-500/20" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-teal-400/30 rounded-full blur-[100px] pointer-events-none dark:bg-teal-500/15" />

      <div className="relative container-market px-4 sm:px-6 py-6 sm:py-8">
        {/* Section header */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 bg-emerald-200 border border-emerald-300 rounded-full px-2.5 py-1 dark:bg-emerald-900/50 dark:border-emerald-600/50">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 tracking-widest uppercase">Digital Axios</span>
            </div>
            <h2 className="text-lg font-bold text-emerald-950 dark:text-gray-100 font-display">
              Nuestros Productos
            </h2>
          </div>

          <Link
            href="/assets?ownerId=aa000000-0000-0000-0000-digitalaxios1"
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900 border border-emerald-300 hover:border-emerald-400 rounded-lg px-3 py-1.5 transition-all bg-white/50 hover:bg-white/80 dark:text-emerald-400 dark:border-emerald-700/50 dark:bg-transparent dark:hover:bg-emerald-900/30"
          >
            Ver todos <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-emerald-200/50 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {assets.map((asset) => (
              <FeaturedCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
