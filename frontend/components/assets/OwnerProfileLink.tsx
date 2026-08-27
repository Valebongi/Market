"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLinkedInUrl, safeExternalUrl } from "@/lib/security";

/**
 * Enlace al perfil externo del titular.
 *
 * El campo del perfil se llama `linkedin`, pero es un input libre: el titular
 * escribe lo que quiera. Antes de este componente, CUALQUIER string se
 * renderizaba con el logo de LinkedIn y el copy "Verificado en LinkedIn", así
 * que `https://evil.tld/perfil-falso` salía sellado como verificado. En un
 * marketplace donde la confianza es el producto, una señal de verificación
 * falsificable es peor que no tener señal.
 *
 * Reglas:
 * - `isLinkedInUrl(url)` (host exacto linkedin.com / www.linkedin.com sobre
 *   https) → sello azul con la marca y el copy de verificado.
 * - http(s) que NO es LinkedIn → se muestra el enlace, en gris, sin marca y sin
 *   la palabra "verificado". El titular puso algo y el visitante puede verlo;
 *   la plataforma simplemente no afirma nada sobre eso.
 * - Cualquier otra cosa (`javascript:`, `mailto:`, basura) → no se renderiza.
 *
 * Lo único que "verificamos" es el host de la URL. No comprobamos que la cuenta
 * de LinkedIn sea del titular: el sello dice que el enlace va a LinkedIn de
 * verdad, nada más.
 */
export default function OwnerProfileLink({
  url,
  size = "md",
  className,
}: {
  url: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const href = safeExternalUrl(url);
  if (!href) return null;

  const verified = isLinkedInUrl(href);
  const sm = size === "sm";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      // El enlace vive dentro de tarjetas clickeables: sin esto, abrirlo
      // dispara además la navegación al detalle del activo.
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold border transition-colors",
        sm
          ? "text-[10px] font-bold gap-1 px-2 py-0.5 rounded-full"
          : "text-xs px-3 py-1.5 rounded-lg",
        verified
          ? "bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20 hover:bg-[#0A66C2]/20"
          : "bg-slate-gray/5 text-slate-gray dark:text-gray-400 border-fog-gray dark:border-white/10 hover:bg-slate-gray/10 dark:hover:bg-white/5",
        className
      )}
    >
      {verified ? (
        <>
          <svg
            className={sm ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          {sm ? "Verificado en LinkedIn" : "Ver perfil en LinkedIn"}
        </>
      ) : (
        <>
          <ExternalLink className={sm ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} aria-hidden="true" />
          Enlace del titular
        </>
      )}
      {!sm && verified && <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />}
    </a>
  );
}
