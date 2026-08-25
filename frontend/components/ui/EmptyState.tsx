"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Button from "./Button";

/**
 * Acción de un EmptyState. Es `onClick` XOR `href` — nunca las dos.
 *
 * - `href`  → navega. Renderiza un <Link> de next/link (no rompe el prefetch).
 * - `onClick` → callback en el cliente (típicamente `clearFilters`).
 *
 * `variant` elige el peso visual:
 * - "button" (default) → <Button> sólido. Para la acción principal
 *   ("Publicar mi Primer Activo").
 * - "link" → texto azul subrayable, sin fondo. Para acciones secundarias de
 *   bajo compromiso ("Limpiar filtros", "Ver todos los activos").
 */
export type EmptyStateAction =
  | { label: string; onClick: () => void; href?: never; variant?: "button" | "link" }
  | { label: string; href: string; onClick?: never; variant?: "button" | "link" };

export interface EmptyStateProps {
  /**
   * Icono. Acepta cualquier ReactNode: un icono de lucide-react
   * (`<Bookmark className="h-8 w-8" />`), un emoji (`"🔍"`) o un <svg> inline.
   * Si se omite no se renderiza el contenedor del icono.
   */
  icon?: ReactNode;
  /**
   * "chip" (default) envuelve el icono en un círculo gris — pensado para
   * iconos de trazo (lucide / svg).
   * "bare" lo renderiza suelto — pensado para emojis, que con el círculo
   * quedan mal.
   */
  iconStyle?: "chip" | "bare";
  title: string;
  description?: string;
  /** Acción principal. */
  action?: EmptyStateAction;
  /**
   * Acción secundaria, a la derecha de la principal. Útil en el caso
   * "hay filtros activos": principal "Limpiar filtros" + secundaria
   * "Publicar un activo".
   */
  secondaryAction?: EmptyStateAction;
  /**
   * Escala del bloque. "sm" para slots chicos dentro de un panel o tabla
   * (paneles de métricas, dropdown de notificaciones); "md" (default) para
   * listas dentro del dashboard; "lg" para páginas completas del marketplace.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Clases extra sobre el contenedor. Sirve para alturas fijas
   * (`h-40`, `h-72`) o fondos (`bg-snow-gray rounded-xl`) sin tocar el resto.
   */
  className?: string;
}

const sizeStyles = {
  sm: {
    wrapper: "py-8 px-4",
    chip: "w-10 h-10 mb-3",
    bare: "text-2xl mb-2",
    title: "text-sm font-semibold",
    description: "text-xs mt-1 max-w-xs",
    actions: "mt-4",
  },
  md: {
    wrapper: "py-12 sm:py-16 px-6",
    chip: "w-14 h-14 sm:w-16 sm:h-16 mb-4 sm:mb-6",
    bare: "text-4xl mb-4",
    title: "text-lg sm:text-xl font-semibold",
    description: "text-sm mt-2 max-w-sm",
    actions: "mt-5",
  },
  lg: {
    wrapper: "py-20 sm:py-24 px-8",
    chip: "w-16 h-16 mb-6",
    bare: "text-5xl mb-5",
    title: "text-xl font-semibold",
    description: "text-base mt-2 max-w-md",
    actions: "mt-6",
  },
} as const;

const linkClasses =
  "text-sm font-medium text-electric-blue hover:underline dark:text-blue-400";

function ActionSlot({ action }: { action: EmptyStateAction }) {
  const asLink = action.variant === "link";

  if (action.href) {
    return asLink ? (
      <Link href={action.href} className={linkClasses}>
        {action.label}
      </Link>
    ) : (
      <Link href={action.href}>
        <Button>{action.label}</Button>
      </Link>
    );
  }

  return asLink ? (
    <button type="button" onClick={action.onClick} className={linkClasses}>
      {action.label}
    </button>
  ) : (
    <Button onClick={action.onClick}>{action.label}</Button>
  );
}

export default function EmptyState({
  icon,
  iconStyle = "chip",
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
}: EmptyStateProps) {
  const s = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        s.wrapper,
        className
      )}
    >
      {icon &&
        (iconStyle === "chip" ? (
          <div
            className={cn(
              "rounded-full bg-snow-gray dark:bg-white/5 flex items-center justify-center text-slate-gray dark:text-gray-500 shrink-0",
              s.chip
            )}
          >
            {icon}
          </div>
        ) : (
          <p className={cn("leading-none", s.bare)}>{icon}</p>
        ))}

      <h3 className={cn("text-carbon-gray dark:text-gray-100", s.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn("text-slate-gray dark:text-gray-400", s.description)}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={cn("flex flex-wrap items-center justify-center gap-4", s.actions)}>
          {action && <ActionSlot action={action} />}
          {secondaryAction && <ActionSlot action={secondaryAction} />}
        </div>
      )}
    </div>
  );
}
