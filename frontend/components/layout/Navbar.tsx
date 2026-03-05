"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import Avatar from "@/components/ui/Avatar";


export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user, loading } = useAuth();

  const navLinks = [
    { href: "/assets", label: "Explorar Activos" },
    { href: "/#como-funciona", label: "Cómo Funciona" },
  ];

  const displayName = user?.profile?.displayName || user?.email?.split("@")[0] || "";

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-fog-gray dark:border-white/10">
      <nav aria-label="Navegación principal" className="container-market flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/Logo DaVinci.png"
            alt="Da Vinci Inventa"
            width={48}
            height={48}
            className="rounded-lg"
            priority
          />
          <div className="hidden sm:block leading-tight">
            <p className="font-display font-semibold text-base text-midnight-blue dark:text-gray-100 leading-none">
              Da Vinci Inventa
            </p>
            <p className="text-[10px] text-slate-gray/60 dark:text-gray-500 mt-0.5">
              by Digital Axios
            </p>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-electric-blue dark:hover:text-blue-400",
                pathname === link.href ? "text-electric-blue dark:text-blue-400" : "text-carbon-gray dark:text-gray-300"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth Buttons (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-24 h-9 bg-fog-gray dark:bg-gray-800 rounded-lg animate-pulse" />
          ) : isAuthenticated ? (
            <Link href="/dashboard" className="flex items-center gap-2">
              <Avatar name={displayName} size="sm" />
              <Button variant="ghost" size="sm" icon={<LayoutDashboard className="h-4 w-4" />}>
                Mi Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Ingresar
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Registrarse</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 text-carbon-gray dark:text-gray-300 hover:text-midnight-blue dark:hover:text-white transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-fog-gray dark:border-white/10 bg-white dark:bg-gray-900 px-6 pb-6 space-y-4 animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-sm font-medium text-carbon-gray dark:text-gray-300 hover:text-electric-blue dark:hover:text-blue-400 py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 pt-2">
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" fullWidth icon={<LayoutDashboard className="h-4 w-4" />}>
                  Mi Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" fullWidth>
                    Ingresar
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)}>
                  <Button fullWidth>Registrarse</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
