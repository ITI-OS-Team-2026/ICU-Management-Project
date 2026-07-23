import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: Boolean(user),
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),

  login: async ({ email, password }) => {
    const user = await authService.login({ email, password });
    get().setUser(user);
    return user;
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      get().clearUser();
    }
  },

  /** Soft session hydrate from /auth/me — returns user or null. */
  hydrate: async () => {
    try {
      const user = await authService.getMe();
      get().setUser(user);
      return user;
    } catch {
      get().clearUser();
      return null;
    }
  },
}));
