"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu, Bell } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import NavigationProgress from "@/components/ui/NavigationProgress";
import NotificationPanel from "@/components/ui/NotificationPanel";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notifications-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const mobileNotifRef = useRef<HTMLButtonElement>(null);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
    setMobileNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const returnTo = window.location.pathname + window.location.search;
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-snow-gray dark:bg-[#0d1117]">
        <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const sidebarUser = {
    name: user.profile?.displayName || user.email,
    email: user.email,
    role: user.role,
    avatarUrl: user.profile?.avatarUrl,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-snow-gray dark:bg-[#0d1117]">
      <NavigationProgress />

      <Sidebar
        user={sidebarUser}
        pendingRequests={0}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header — hidden on md+ */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 shrink-0 bg-[#f8faff] dark:bg-[#111827] border-b-2 border-blue-100 dark:border-white/10 z-20 relative">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-lg text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/Logo DaVinci.png" alt="Da Vinci" width={30} height={30} className="rounded-lg" />
            <span className="font-display font-semibold text-sm text-midnight-blue dark:text-gray-100 tracking-tight">Da Vinci</span>
          </Link>

          <div className="relative">
            <button
              ref={mobileNotifRef}
              onClick={() => setMobileNotifOpen((v) => !v)}
              className="p-2 rounded-lg text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 hover:bg-snow-gray dark:hover:bg-white/5 transition-colors relative"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-electric-blue" />
              )}
            </button>

            {mobileNotifOpen && (
              <NotificationPanel
                onClose={() => setMobileNotifOpen(false)}
                anchorRef={mobileNotifRef}
                panelClassName="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 rounded-xl shadow-medium z-50 overflow-hidden"
              />
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
