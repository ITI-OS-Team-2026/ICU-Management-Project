import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * The single source of truth for keyboard shortcuts.
 *
 * Every shortcut is declared once, here, with its default binding, its label
 * and where it applies. The settings page (rebinding) and the help overlay
 * (reference) both read this — previously the labels lived in SettingsPage and
 * the bindings lived here, and the two drifted apart.
 *
 * Adding a shortcut means adding it to SHORTCUT_REGISTRY *and* registering a
 * handler via useShortcuts in the component that owns the behaviour. An entry
 * with no handler shows up in the help overlay and does nothing, which is worse
 * than not listing it at all.
 */
export const SHORTCUT_REGISTRY = {
  global: {
    title: 'Anywhere',
    description: 'Available on every screen.',
    items: {
      showShortcuts: { label: 'Show keyboard shortcuts', default: '?' },
      goToDashboard: { label: 'Go to dashboard', default: 'alt+d' },
      goToSettings: { label: 'Go to settings', default: 'alt+s' },
      focusSearch: { label: 'Focus the search box', default: '/' },
    },
  },
  dashboard: {
    title: 'Dashboard',
    description: 'While browsing the patient list on the clinical dashboard.',
    roles: ['MEDICAL_RESIDENT', 'ICU_SPECIALIST'],
    items: {
      nextPatient: { label: 'Select next patient', default: 'j' },
      prevPatient: { label: 'Select previous patient', default: 'k' },
      openPatient: { label: 'Open selected patient', default: 'enter' },
      admitPatient: { label: 'Admit a new patient', default: 'n' },
    },
  },
  patientDetails: {
    title: 'Patient record',
    description: 'While viewing a patient. Jumps straight to a tab.',
    items: {
      closePatient: { label: 'Back to dashboard', default: 'escape' },
      openOverview: { label: 'Overview', default: 'o' },
      openVitals: { label: 'Vitals', default: 'v' },
      openDiagnoses: { label: 'Diagnoses', default: 'g' },
      openMedications: { label: 'Medications', default: 'm' },
      openNotes: { label: 'Notes', default: 'n' },
      openDocuments: { label: 'Documents', default: 'd' },
      openFollowUps: { label: 'Follow-ups', default: 'f' },
      openApprovals: { label: 'Treatment approvals', default: 'r' },
      openAlerts: { label: 'Alerts', default: 'l' },
      openAiAssistant: { label: 'AI summary', default: 'a' },
    },
  },
};

/** Flattened defaults, in the { context: { action: key } } shape. */
export const DEFAULT_SHORTCUTS = Object.fromEntries(
  Object.entries(SHORTCUT_REGISTRY).map(([context, group]) => [
    context,
    Object.fromEntries(
      Object.entries(group.items).map(([action, item]) => [action, item.default])
    ),
  ])
);

export const getShortcutLabel = (context, action) =>
  SHORTCUT_REGISTRY[context]?.items?.[action]?.label || action;

// Keeps a user's own rebindings while dropping actions that no longer exist and
// adding ones introduced since they last used the app. Without this, anyone who
// had already customised a shortcut would keep the old broken set forever.
// Bindings written before the shift-normalisation fix could contain sequences
// no real keypress can produce ('shift+/' for '?'), leaving the shortcut dead.
const normalizeSavedBinding = (binding) => {
  if (typeof binding !== 'string') return binding;
  const parts = binding.split('+');
  const key = parts[parts.length - 1];
  if (parts.includes('shift') && key.length === 1 && !/[a-z]/.test(key)) {
    // Drop the redundant shift; the character itself already carries it.
    const rest = parts.filter((part) => part !== 'shift' && part !== key);
    return [...rest, SHIFTED_CHARACTERS[key] || key].join('+');
  }
  return binding;
};

// Only the pairs we actually shipped defaults for; anything else keeps its key.
const SHIFTED_CHARACTERS = { '/': '?' };

const reconcileWithRegistry = (saved) => {
  const result = {};
  for (const [context, defaults] of Object.entries(DEFAULT_SHORTCUTS)) {
    result[context] = { ...defaults };
    const savedContext = saved?.[context];
    if (!savedContext) continue;
    for (const action of Object.keys(defaults)) {
      if (typeof savedContext[action] === 'string') {
        result[context][action] = normalizeSavedBinding(savedContext[action]);
      }
    }
  }
  return result;
};

export const useShortcutStore = create(
  persist(
    (set, get) => ({
      shortcuts: DEFAULT_SHORTCUTS,

      // The help overlay is opened from the header button and from the
      // shortcut itself, so its open state lives here rather than in a layout.
      isHelpOpen: false,
      openShortcutHelp: () => set({ isHelpOpen: true }),
      closeShortcutHelp: () => set({ isHelpOpen: false }),
      toggleShortcutHelp: () => set((state) => ({ isHelpOpen: !state.isHelpOpen })),

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
      version: 3,
      // Only the bindings are worth persisting; the overlay must never be
      // restored as open on a fresh load.
      partialize: (state) => ({ shortcuts: state.shortcuts }),
      migrate: (persisted) => ({
        shortcuts: reconcileWithRegistry(persisted?.shortcuts),
      }),
      merge: (persisted, current) => ({
        ...current,
        shortcuts: reconcileWithRegistry(persisted?.shortcuts),
      }),
    }
  )
);
