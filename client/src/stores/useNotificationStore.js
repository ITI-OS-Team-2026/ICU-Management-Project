import { create } from "zustand";
import api from "../lib/api"; // Assuming you have an axios instance in lib/api
import { initSocket } from "../lib/socket";

const PAGE_SIZE = 20;

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isInitialized: false,
  hasMore: false,
  nextCursor: null,
  isLoadingMore: false,

  /** First page — replaces the list. Unread count comes from this page only;
   *  the badge reflects what's fetched, not every notification ever sent. */
  fetchNotifications: async () => {
    try {
      const res = await api.get(`/notifications?limit=${PAGE_SIZE}`);
      const { notifications, hasMore, nextCursor } = res.data.data;
      set({
        notifications,
        unreadCount: notifications.filter((n) => n.status === "UNREAD").length,
        isInitialized: true,
        hasMore,
        nextCursor,
      });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  },

  /** Appends the next page after the last id already loaded. */
  loadMore: async () => {
    const { hasMore, nextCursor, isLoadingMore } = get();
    if (!hasMore || !nextCursor || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const res = await api.get(
        `/notifications?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(nextCursor)}`
      );
      const { notifications, hasMore: hasMoreNext, nextCursor: nextCursorNext } = res.data.data;
      set((state) => ({
        // A notification can arrive in real time between pages; skip it here
        // rather than risk a duplicate id further down the list.
        notifications: [
          ...state.notifications,
          ...notifications.filter((n) => !state.notifications.some((existing) => existing.id === n.id)),
        ],
        hasMore: hasMoreNext,
        nextCursor: nextCursorNext,
      }));
    } catch (err) {
      console.error("Failed to load more notifications:", err);
    } finally {
      set({ isLoadingMore: false });
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
