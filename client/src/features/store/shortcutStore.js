import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_SHORTCUTS = {
  global: {
    goToDashboard: 'alt+d',
    goToSettings: 'alt+s',
    focusSearch: '/',
  },
  dashboard: {
    nextPatient: 'j',
    prevPatient: 'k',
    openPatient: 'enter',
    admitPatient: 'n',
  },
  patientDetails: {
    closePatient: 'escape',
    openOverview: 'o',
    openVitals: 'v',
    openLabs: 'l',
    openMedications: 'm',
    openAiAssistant: 'a',
    openNotes: 'n',
    openDocuments: 'd',
    focusAction: 'i',
  }
};

export const useShortcutStore = create(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,

      // Update a specific shortcut in a specific context
      setShortcut: (context, action, keySequence) => set((state) => {
        const newShortcuts = { ...state.shortcuts };
        if (newShortcuts[context]) {
          newShortcuts[context] = {
            ...newShortcuts[context],
            [action]: keySequence.toLowerCase(),
          };
        }
        return { shortcuts: newShortcuts };
      }),

      // Reset all shortcuts to defaults
      resetToDefaults: () => set({ shortcuts: DEFAULT_SHORTCUTS }),
      
      // Helper to get a specific shortcut
      getShortcut: (context, action) => {
        const state = get();
        return state.shortcuts[context]?.[action];
      },
    }),
    {
      name: 'smartcare-shortcuts-storage',
    }
  )
);
