import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type BadgeVariant = "primary" | "success" | "warning" | "error" | "neutral" | "indigo";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-blue-50 text-electric-blue dark:bg-blue-950/50 dark:text-blue-400",
  success: "bg-emerald-50 text-deep-emerald dark:bg-emerald-950/50 dark:text-emerald-400",
  warning: "bg-amber-50 text-warm-amber dark:bg-amber-950/50 dark:text-amber-400",
  error: "bg-red-50 text-soft-coral dark:bg-red-950/50 dark:text-red-400",
  neutral: "bg-fog-gray text-carbon-gray dark:bg-white/10 dark:text-gray-300",
  indigo: "bg-indigo-50 text-soft-indigo dark:bg-indigo-950/50 dark:text-indigo-400",
};

export default function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Badge para estados de activos
export function AssetStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: "Borrador", variant: "neutral" },
    published: { label: "Publicado", variant: "success" },
    flagged: { label: "En Revisión", variant: "warning" },
    archived: { label: "Archivado", variant: "neutral" },
  };
  const config = map[status] || { label: status, variant: "neutral" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Badge para roles
export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    admin: { label: "Admin", variant: "indigo" },
    asset_owner: { label: "Titular", variant: "primary" },
    entrepreneur: { label: "Emprendedor", variant: "success" },
  };
  const config = map[role] || { label: role, variant: "neutral" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Badge para solicitudes
export function RequestStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: "Pendiente", variant: "warning" },
    accepted: { label: "Aceptada", variant: "success" },
    rejected: { label: "Rechazada", variant: "error" },
  };
  const config = map[status] || { label: status, variant: "neutral" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
