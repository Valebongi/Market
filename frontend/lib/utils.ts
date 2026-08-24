import { type ClassValue, clsx } from "clsx";
import type { AssetStatus, LicenseType, UserRole } from "@/types";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  if (days < 7) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  if (weeks < 4) return `hace ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Las categorías de activos viven en un único lugar: lib/asset-categories.ts.
// Se re-exportan acá por compatibilidad con los imports existentes de @/lib/utils.
export {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_VALUES,
  ASSET_TYPE_LABELS,
  getAssetCategoryLabel,
  isAssetCategory,
} from "@/lib/asset-categories";

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  exclusive: "Exclusiva",
  non_exclusive: "No Exclusiva",
  temporary: "Temporal",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  flagged: "Revisión",
  archived: "Archivado",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  asset_owner: "Titular",
  entrepreneur: "Emprendedor",
};
