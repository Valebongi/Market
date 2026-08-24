"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { requestsService, type AppNotification } from "@/services/requests.service";

const POLL_INTERVAL = 30_000;

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: async () => {},
  refresh: () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await requestsService.getNotifications(15);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    await requestsService.markNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, markAllRead, refresh: fetchNotifications }),
    [notifications, unreadCount, markAllRead, fetchNotifications]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
