"use client";

import { useEffect, useRef } from "react";
import React from "react";
import Link from "next/link";
import { Bell, CheckCheck, MessageSquare, FileText, CheckCircle, XCircle, X } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { safeInternalHref } from "@/lib/security";
import { useNotifications } from "@/lib/notifications-context";
import type { AppNotification } from "@/services/requests.service";
import EmptyState from "./EmptyState";

function notifIcon(type: string) {
  switch (type) {
    case "new_request":    return <FileText className="h-4 w-4 text-electric-blue dark:text-blue-400" />;
    case "new_message":    return <MessageSquare className="h-4 w-4 text-deep-emerald dark:text-emerald-400" />;
    case "request_accepted": return <CheckCircle className="h-4 w-4 text-deep-emerald dark:text-emerald-400" />;
    case "request_rejected": return <XCircle className="h-4 w-4 text-soft-coral dark:text-red-400" />;
    case "request_closed":   return <X className="h-4 w-4 text-slate-gray dark:text-gray-400" />;
    default: return <Bell className="h-4 w-4 text-slate-gray dark:text-gray-400" />;
  }
}

interface Props {
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
  panelClassName?: string;
}

export default function NotificationPanel({ onClose, anchorRef, panelClassName }: Props) {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const insidePanel = panelRef.current?.contains(target);
      const insideAnchor = anchorRef?.current?.contains(target);
      if (!insidePanel && !insideAnchor) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={panelRef}
      className={panelClassName ?? "absolute left-full bottom-0 ml-2 w-80 bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl shadow-medium z-50 overflow-hidden"}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fog-gray dark:border-white/10">
        <span className="text-sm font-semibold text-carbon-gray dark:text-gray-100">Notificaciones</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-electric-blue dark:text-blue-400 hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todo leído
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <EmptyState
            size="sm"
            iconStyle="bare"
            icon={<Bell className="h-8 w-8 text-slate-gray/30 dark:text-gray-600" />}
            title="Sin notificaciones"
            className="py-10"
          />
        ) : (
          notifications.map((n) => (
            <NotifItem key={n.id} notification={n} onClose={onClose} />
          ))
        )}
      </div>
    </div>
  );
}

function NotifItem({ notification: n, onClose }: { notification: AppNotification; onClose: () => void }) {
  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors border-b border-fog-gray/50 dark:border-white/5 last:border-0",
        !n.read && "bg-blue-50/40 dark:bg-blue-950/10"
      )}
    >
      <div className="mt-0.5 p-1.5 bg-white dark:bg-gray-800 rounded-lg border border-fog-gray dark:border-white/10 shrink-0">
        {notifIcon(n.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", n.read ? "text-slate-gray dark:text-gray-400" : "font-medium text-carbon-gray dark:text-gray-100")}>
          {n.title}
        </p>
        <p className="text-xs text-slate-gray dark:text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-[10px] text-slate-gray/60 dark:text-gray-600 mt-1">{formatRelativeTime(n.createdAt)}</p>
      </div>
      {!n.read && (
        <div className="w-1.5 h-1.5 rounded-full bg-electric-blue dark:bg-blue-400 mt-2 shrink-0" />
      )}
    </div>
  );

  // `link` viene de un registro de la tabla `notifications` y se renderiza en un
  // panel autenticado. Sólo se linkea si es una ruta interna: así una
  // notificación con un destino absoluto no puede sacar al usuario del sitio
  // desde dentro del dashboard.
  const href = safeInternalHref(n.link);

  return href ? (
    <Link href={href} onClick={onClose}>
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
}
