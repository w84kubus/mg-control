import { create } from "zustand";
import type { AppNotification } from "@/types";

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  setNotifications: (notifications: AppNotification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    }),
  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return { notifications: updated, unreadCount: updated.filter((n) => !n.isRead).length };
    }),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));
