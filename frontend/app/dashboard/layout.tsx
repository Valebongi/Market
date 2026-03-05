"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

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
      <Sidebar user={sidebarUser} pendingRequests={0} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
