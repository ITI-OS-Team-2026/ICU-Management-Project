import { create } from "zustand";
import api from "../lib/api"; // Assuming you have an axios instance in lib/api
import { initSocket } from "../lib/socket";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isInitialized: false,

  fetchNotifications: async () => {
    try {
      const res = await api.get("/notifications?limit=50");
      const notifications = res.data.data.notifications;
      set({
        notifications,
        unreadCount: notifications.filter((n) => n.status === "UNREAD").length,
        isInitialized: true,
      });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  },

  markAsRead: async (id) => {
    const notification = get().notifications.find((n) => n.id === id);
    if (!notification || notification.status === "READ") return;

    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, status: "READ" } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      // Revert on failure
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, status: "UNREAD" } : n
        ),
        unreadCount: state.unreadCount + 1,
      }));
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  initRealtime: () => {
    const socket = initSocket();
    
    // Remove existing listener to prevent duplicates
    socket.off("notification");
    
    socket.on("notification", (notification) => {
      get().addNotification(notification);
    });
  },
}));

export default useNotificationStore;
