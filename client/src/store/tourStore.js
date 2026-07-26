import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTourStore = create(
  persist(
    (set) => ({
      hasCompletedAdminBedsTour: false,
      completeAdminBedsTour: () => set({ hasCompletedAdminBedsTour: true }),
      resetTours: () => set({ hasCompletedAdminBedsTour: false }),
    }),
    {
      name: 'tour-storage', // unique name for localStorage
    }
  )
);
