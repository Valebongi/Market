"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  Globe,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  ShieldCheck,
  Users,
  BarChart2,
  ChevronLeft,
  Menu,
  Moon,
  Sun,
  Bookmark,
  Bell,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useNotifications } from "@/lib/notifications-context";
import NotificationPanel from "@/components/ui/NotificationPanel";
import type { UserRole } from "@/types";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function SidebarLink({ href, icon, label, badge, active, collapsed, onClick }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        active
          ? "bg-blue-50 dark:bg-blue-950/40 text-electric-blue dark:text-blue-400 border-l-[3px] border-electric-blue dark:border-blue-400 pl-[9px]"
          : "text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5 hover:text-carbon-gray dark:hover:text-gray-200",
        collapsed && "justify-center px-2"
      )}
    >
      <span className="shrink-0 h-5 w-5">{icon}</span>
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="bg-electric-blue text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    role: UserRole | string;
    // El backend devuelve `null` (no `undefined`) para un avatar sin setear.
    avatarUrl?: string | null;
  };
  pendingRequests?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ user, pendingRequests = 0, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const bellRef = useRef<HTMLButtonElement>(null);
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { unreadCount } = useNotifications();

  // On mobile the sidebar is always full-width; collapsed only affects desktop
  const showCollapsed = collapsed && !mobileOpen;

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "asset_owner";

  const handleLinkClick = (href: string) => {
    setPendingHref(href);
    onMobileClose?.();
  };

  const mainLinks = [
    { href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", show: true },
    // "Mis Activos" es la bandeja de publicación: sólo tiene sentido para el
    // titular (y para el admin, que puede tener activos propios). El emprendedor
    // no publica — para él este ítem abría una lista siempre vacía.
    { href: "/dashboard/assets", icon: <Package className="h-5 w-5" />, label: "Mis Activos", show: isOwner || isAdmin },
    { href: "/dashboard/requests", icon: <MessageSquare className="h-5 w-5" />, label: "Solicitudes", badge: pendingRequests, show: true },
    { href: "/dashboard/explore", icon: <Search className="h-5 w-5" />, label: "Explorar Marketplace", show: true },
    { href: "/dashboard/domains", icon: <Globe className="h-5 w-5" />, label: "Dominios", show: true },
    { href: "/dashboard/saved", icon: <Bookmark className="h-5 w-5" />, label: "Guardados", show: true },
  ];

  const adminLinks = [
    { href: "/dashboard/admin", icon: <ShieldCheck className="h-5 w-5" />, label: "Panel Admin" },
    { href: "/dashboard/admin/assets", icon: <Package className="h-5 w-5" />, label: "Moderación" },
    { href: "/dashboard/admin/users", icon: <Users className="h-5 w-5" />, label: "Usuarios" },
    { href: "/dashboard/admin/metrics", icon: <BarChart2 className="h-5 w-5" />, label: "Métricas" },
  ];

  const bottomLinks = [
    { href: "/dashboard/settings", icon: <Settings className="h-5 w-5" />, label: "Configuración" },
    { href: "/dashboard/help", icon: <HelpCircle className="h-5 w-5" />, label: "Ayuda" },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "flex flex-col bg-[#f8faff] dark:bg-[#111827] border-r-2 border-blue-100 dark:border-white/10",
          "shadow-[2px_0_12px_rgba(37,99,235,0.06)] z-40",
          // Mobile: fixed drawer | Desktop: sticky sidebar
          "fixed inset-y-0 left-0 md:sticky md:top-0 md:inset-auto md:h-screen",
          // Slide in/out on mobile; always visible on desktop
          "transition-transform duration-300 ease-in-out md:transition-all md:duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          // Width: always w-64 on mobile, collapsible on desktop
          showCollapsed ? "md:w-16 w-64" : "w-64"
        )}
      >
        {/* Logo + controls */}
        <div className={cn(
          "flex items-center h-16 border-b border-fog-gray dark:border-white/10 px-4",
          showCollapsed ? "justify-center" : "justify-between"
        )}>
          {showCollapsed ? (
            <Link href="/dashboard">
              <Image src="/Logo DaVinci.png" alt="Da Vinci" width={38} height={38} className="rounded-lg" />
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/Logo DaVinci.png" alt="Da Vinci" width={38} height={38} className="rounded-lg" />
              <span className="font-display font-semibold text-sm text-midnight-blue dark:text-gray-100 tracking-tight">Da Vinci</span>
            </Link>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden md:flex p-1.5 text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/5 rounded-lg transition-colors"
            aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className={cn("flex items-center gap-3 p-4 border-b border-fog-gray dark:border-white/10", showCollapsed && "justify-center")}>
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            {!showCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-carbon-gray dark:text-gray-100 truncate">{user.name}</p>
                <p className="text-xs text-slate-gray dark:text-gray-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {mainLinks
            .filter((l) => l.show)
            .map((link) => {
              const isActive = pendingHref
                ? pendingHref === link.href
                : link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href) && link.href !== "/";
              return (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  badge={link.badge}
                  active={isActive}
                  collapsed={showCollapsed}
                  onClick={() => handleLinkClick(link.href)}
                />
              );
            })}

          {isAdmin && (
            <>
              <div className={cn("pt-4 pb-2", !showCollapsed && "px-3")}>
                {!showCollapsed && (
                  <p className="text-xs font-medium text-slate-gray dark:text-gray-500 uppercase tracking-wider">
                    Administración
                  </p>
                )}
                {showCollapsed && <div className="border-t border-fog-gray dark:border-white/10" />}
              </div>
              {adminLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  active={pendingHref ? pendingHref === link.href : pathname.startsWith(link.href)}
                  collapsed={showCollapsed}
                  onClick={() => handleLinkClick(link.href)}
                />
              ))}
            </>
          )}
        </nav>

        {/* Bottom links */}
        <div className="p-3 border-t border-fog-gray dark:border-white/10 space-y-1 relative">
          {/* Notification bell — desktop only (mobile header has its own) */}
          <button
            ref={bellRef}
            onClick={() => setShowNotifications((v) => !v)}
            title={showCollapsed ? "Notificaciones" : undefined}
            className={cn(
              "hidden md:flex relative items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full",
              showNotifications
                ? "bg-blue-50 dark:bg-blue-950/40 text-electric-blue dark:text-blue-400"
                : "text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5 hover:text-carbon-gray dark:hover:text-gray-200",
              showCollapsed && "justify-center px-2"
            )}
          >
            <span className="relative shrink-0">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-electric-blue text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            {!showCollapsed && <span>Notificaciones</span>}
            {!showCollapsed && unreadCount > 0 && (
              <span className="ml-auto bg-electric-blue text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationPanel onClose={() => setShowNotifications(false)} anchorRef={bellRef} />
          )}

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5 hover:text-carbon-gray dark:hover:text-gray-200 transition-all duration-150 w-full",
              showCollapsed && "justify-center px-2"
            )}
          >
            {theme === "dark"
              ? <Sun className="h-5 w-5 shrink-0 text-warm-amber" />
              : <Moon className="h-5 w-5 shrink-0" />
            }
            {!showCollapsed && (
              <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
            )}
          </button>

          {bottomLinks.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={pendingHref ? pendingHref === link.href : pathname.startsWith(link.href)}
              collapsed={showCollapsed}
              onClick={() => handleLinkClick(link.href)}
            />
          ))}

          <button
            onClick={logout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-gray dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-soft-coral dark:hover:text-red-400 transition-all duration-150 w-full",
              showCollapsed && "justify-center px-2"
            )}
            title={showCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!showCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>

        {/* Company attribution */}
        {!showCollapsed && (
          <div className="px-4 py-3 border-t border-fog-gray dark:border-white/10">
            <p className="text-[10px] text-slate-gray/60 dark:text-gray-600 leading-relaxed">
              Un producto de{" "}
              <span className="font-medium text-slate-gray/80 dark:text-gray-500">Digital Axios</span>
            </p>
            <p className="text-[10px] text-slate-gray/50 dark:text-gray-700 mt-0.5">
              © {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
