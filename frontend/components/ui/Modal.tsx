"use client";

import { useEffect, useCallback, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  closeOnOverlay?: boolean;
  footer?: ReactNode;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  fullscreen: "max-w-[95vw] max-h-[95vh]",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  closeOnOverlay = true,
  footer,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className={cn(
          "relative w-full bg-white rounded-2xl shadow-large",
          "max-h-[90vh] flex flex-col",
          "animate-scale-in",
          sizeClasses[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-8 pb-6 border-b border-fog-gray">
            <div>
              {title && (
                <h3 id="modal-title" className="text-lg font-semibold text-carbon-gray">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-slate-gray mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-gray hover:text-carbon-gray transition-colors p-1 rounded-lg hover:bg-snow-gray ml-4 flex-shrink-0"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Close button when no header */}
        {!title && !description && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-gray hover:text-carbon-gray transition-colors p-1.5 rounded-lg hover:bg-snow-gray z-10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 pt-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-8 pt-0 border-t border-fog-gray">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * Acá vivía `ConfirmModal`, un wrapper de confirmación que no importaba nadie.
 * Los dos flujos destructivos de la app (borrar activo en `dashboard/assets`,
 * suspender usuario en `admin/users`) usan `<Modal>` directo porque necesitan
 * cuerpo propio, y `ConfirmModal` renderizaba un `<div />` vacío como children.
 * Se borró: un atajo que no sirve para los únicos dos casos que existen no es
 * un atajo. Un `<Modal size="sm">` con `footer` hace lo mismo en 10 líneas.
 */
