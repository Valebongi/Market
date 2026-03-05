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
} from "lucide-react";
import { cn } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active?: boolean;
  collapsed?: boolean;
}

function SidebarLink({ href, icon, label, badge, active, collapsed }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
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
    role: string;
    avatarUrl?: string;
  };
  pendingRequests?: number;
}

export default function Sidebar({ user, pendingRequests = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const { theme, toggle } = useTheme();

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "asset_owner";

  const mainLinks = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
      show: true,
    },
    {
      href: "/dashboard/assets",
      icon: <Package className="h-5 w-5" />,
      label: "Mis Activos",
      show: isOwner,
    },
    {
      href: "/dashboard/requests",
      icon: <MessageSquare className="h-5 w-5" />,
      label: "Solicitudes",
      badge: pendingRequests,
      show: true,
    },
    {
      href: "/assets",
      icon: <Search className="h-5 w-5" />,
      label: "Explorar Marketplace",
      show: true,
    },
    {
      href: "/dashboard/domains",
      icon: <Globe className="h-5 w-5" />,
      label: "Dominios",
      show: true,
    },
  ];

  const adminLinks = [
    {
      href: "/dashboard/admin",
      icon: <ShieldCheck className="h-5 w-5" />,
      label: "Panel Admin",
    },
    {
      href: "/dashboard/admin/assets",
      icon: <Package className="h-5 w-5" />,
      label: "Moderación",
    },
    {
      href: "/dashboard/admin/users",
      icon: <Users className="h-5 w-5" />,
      label: "Usuarios",
    },
    {
      href: "/dashboard/admin/metrics",
      icon: <BarChart2 className="h-5 w-5" />,
      label: "Métricas",
    },
  ];

  const bottomLinks = [
    {
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
      label: "Configuración",
    },
    {
      href: "/dashboard/help",
      icon: <HelpCircle className="h-5 w-5" />,
      label: "Ayuda",
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-fog-gray dark:border-white/10 sticky top-0 transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + collapse button */}
      <div className={cn("flex items-center h-16 border-b border-fog-gray dark:border-white/10 px-4", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? (
          <Link href="/dashboard">
            <Image src="/Logo DaVinci.png" alt="Da Vinci" width={38} height={38} className="rounded-lg" />
          </Link>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/Logo DaVinci.png" alt="Da Vinci" width={38} height={38} className="rounded-lg" />
            <span className="font-display font-semibold text-sm text-midnight-blue dark:text-gray-100 tracking-tight">Da Vinci</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/5 rounded-lg transition-colors"
          aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className={cn("flex items-center gap-3 p-4 border-b border-fog-gray dark:border-white/10", collapsed && "justify-center")}>
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          {!collapsed && (
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
          .map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              badge={link.badge}
              active={
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href) && link.href !== "/"
              }
              collapsed={collapsed}
            />
          ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className={cn("pt-4 pb-2", !collapsed && "px-3")}>
              {!collapsed && (
                <p className="text-xs font-medium text-slate-gray dark:text-gray-500 uppercase tracking-wider">
                  Administración
                </p>
              )}
              {collapsed && <div className="border-t border-fog-gray dark:border-white/10" />}
            </div>
            {adminLinks.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                active={pathname.startsWith(link.href)}
                collapsed={collapsed}
              />
            ))}
          </>
        )}
      </nav>

      {/* Bottom links */}
      <div className="p-3 border-t border-fog-gray dark:border-white/10 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-gray dark:text-gray-400 hover:bg-snow-gray dark:hover:bg-white/5 hover:text-carbon-gray dark:hover:text-gray-200 transition-all duration-150 w-full",
            collapsed && "justify-center px-2"
          )}
        >
          {theme === "dark"
            ? <Sun className="h-5 w-5 shrink-0 text-warm-amber" />
            : <Moon className="h-5 w-5 shrink-0" />
          }
          {!collapsed && (
            <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
          )}
        </button>

        {bottomLinks.map((link) => (
          <SidebarLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            active={pathname.startsWith(link.href)}
            collapsed={collapsed}
          />
        ))}
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-gray dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-soft-coral dark:hover:text-red-400 transition-all duration-150 w-full",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>

      {/* Company attribution */}
      {!collapsed && (
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
  );
}
