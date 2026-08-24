"use client";

import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { SavedAssetsProvider } from "@/lib/saved-assets-context";
import { NotificationsProvider } from "@/lib/notifications-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SavedAssetsProvider>
        <NotificationsProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NotificationsProvider>
      </SavedAssetsProvider>
    </AuthProvider>
  );
}
