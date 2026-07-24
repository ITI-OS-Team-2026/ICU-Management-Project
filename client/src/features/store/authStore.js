import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: Boolean(user),
        });
      },

      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

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
    }),
    {
      name: 'smartcare_auth', // unique name for localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'smartcare_auth') {
      // The persist middleware updated localStorage from another tab.
      // Force a reload so the router can re-evaluate auth guards with the new state.
      window.location.reload();
    }
  });
}
