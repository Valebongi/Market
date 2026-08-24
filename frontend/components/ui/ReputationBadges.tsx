import { ShieldCheck, Zap, Package, Star, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OwnerStats {
  publishedAssets: number;
  hasCompletedProfile: boolean;
  hasAvatarOrBio: boolean;
}

interface Badge {
  label: string;
  icon: React.ReactNode;
  color: string;
  condition: boolean;
}

function getBadges(stats: OwnerStats): Badge[] {
  return [
    {
      label: "Perfil Verificado",
      icon: <ShieldCheck className="h-3 w-3" />,
      color: "bg-blue-50 dark:bg-blue-950/30 text-electric-blue dark:text-blue-400 border-blue-200 dark:border-blue-800",
      condition: stats.hasCompletedProfile,
    },
    {
      label: "Titular Activo",
      icon: <Zap className="h-3 w-3" />,
      color: "bg-emerald-50 dark:bg-emerald-950/30 text-deep-emerald dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      condition: stats.publishedAssets >= 1,
    },
    {
      label: "Multi-activo",
      icon: <Package className="h-3 w-3" />,
      color: "bg-indigo-50 dark:bg-indigo-950/30 text-soft-indigo dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      condition: stats.publishedAssets >= 3,
    },
    {
      label: "Catálogo Grande",
      icon: <Star className="h-3 w-3" />,
      color: "bg-amber-50 dark:bg-amber-950/30 text-warm-amber dark:text-amber-400 border-amber-200 dark:border-amber-800",
      condition: stats.publishedAssets >= 8,
    },
    {
      label: "Perfil Completo",
      icon: <Award className="h-3 w-3" />,
      color: "bg-violet-50 dark:bg-violet-950/30 text-soft-indigo dark:text-violet-400 border-violet-200 dark:border-violet-800",
      condition: stats.hasAvatarOrBio,
    },
  ].filter((b) => b.condition);
}

interface ReputationBadgesProps {
  stats: OwnerStats;
  className?: string;
  size?: "sm" | "md";
}

export default function ReputationBadges({ stats, className, size = "md" }: ReputationBadgesProps) {
  const badges = getBadges(stats);
  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border font-medium",
            size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
            badge.color
          )}
        >
          {badge.icon}
          {badge.label}
        </span>
      ))}
    </div>
  );
}
