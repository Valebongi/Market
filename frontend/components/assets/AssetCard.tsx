import Link from "next/link";
import { Eye, MessageSquare, Clock } from "lucide-react";
import { cn, formatRelativeTime, ASSET_TYPE_LABELS, LICENSE_TYPE_LABELS, formatNumber } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { Asset } from "@/types";

interface AssetCardProps {
  asset: Asset;
  className?: string;
}

export default function AssetCard({ asset, className }: AssetCardProps) {
  const categoryLabel = ASSET_TYPE_LABELS[asset.assetType] || asset.assetType;
  const licenseLabel = LICENSE_TYPE_LABELS[asset.licenseType] || asset.licenseType;

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl p-6",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-medium hover:border-blue-200 dark:hover:border-blue-700",
        className
      )}
    >
      {/* Category badge */}
      <div className="flex items-center justify-between">
        <Badge variant="primary">{categoryLabel}</Badge>
      </div>

      {/* Title */}
      <h3 className="mt-3 font-semibold text-lg text-carbon-gray dark:text-gray-100 line-clamp-2 leading-snug">
        {asset.title}
      </h3>

      {/* Description */}
      <p className="mt-2 text-sm text-slate-gray dark:text-gray-400 line-clamp-3 leading-relaxed">
        {asset.description}
      </p>

      {/* Metadata */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-gray dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="font-medium text-carbon-gray dark:text-gray-300">{licenseLabel}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(asset.createdAt)}
        </span>
      </div>

      {/* Stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-gray dark:text-gray-500">
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {formatNumber(asset.viewCount)} vistas
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {formatNumber(asset.requestCount)} solicitudes
        </span>
      </div>

      {/* Owner */}
      {asset.owner && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-fog-gray dark:border-white/10">
          <Avatar
            name={asset.owner.displayName}
            src={asset.owner.avatarUrl}
            size="sm"
          />
          <span className="text-xs text-slate-gray dark:text-gray-400 truncate">
            {asset.owner.displayName}
          </span>
        </div>
      )}

      {/* CTA */}
      <div className="mt-4">
        <Link href={`/assets/${asset.id}`}>
          <Button variant="secondary" size="sm" fullWidth>
            Ver Detalles
          </Button>
        </Link>
      </div>
    </div>
  );
}
