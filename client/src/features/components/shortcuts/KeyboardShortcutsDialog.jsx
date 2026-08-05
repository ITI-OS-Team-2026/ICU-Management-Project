import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Keyboard, RotateCcw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '../../store/authStore';
import { getEventKeyString } from '../../hooks/useShortcuts';
import { SHORTCUT_REGISTRY, getShortcutLabel, useShortcutStore } from '../../store/shortcutStore';

const KEY_ALIASES = {
  escape: 'Esc',
  enter: 'Enter',
  space: 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  ctrl: 'Ctrl',
  meta: '⌘',
  alt: 'Alt',
  shift: 'Shift',
};

const prettyKey = (binding) => {
  if (!binding) return ['Unbound'];
  return binding.split('+').map((part) => KEY_ALIASES[part] || part.toUpperCase());
};

function KeyCombo({ binding }) {
  const parts = prettyKey(binding);
  return (
    <span className="flex shrink-0 items-center gap-1">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
          <kbd className="min-w-[26px] rounded border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold text-foreground shadow-2xs">
            {part}
          </kbd>
        </span>
      ))}
    </span>
  );
}

/**
 * The keyboard shortcut reference and editor, reachable from anywhere with `?`.
 *
 * Both jobs live here on purpose: looking a shortcut up and deciding to change
 * it happen in the same moment, and sending the user to a settings page in
 * between defeats the point of having shortcuts at all.
 */
// Split out so it mounts only while the dialog is open: the in-progress
// recording and any error message then reset by unmounting, with no effect
// reaching back to clear them.
function ShortcutPanel({ onClose }) {
  const user = useAuthStore((state) => state.user);
  const shortcuts = useShortcutStore((state) => state.shortcuts);
  const setShortcut = useShortcutStore((state) => state.setShortcut);
  const resetToDefaults = useShortcutStore((state) => state.resetToDefaults);

  const [recording, setRecording] = useState(null); // { context, action }
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  // Radix moves focus into the dialog on open, which scrolled this list
  // straight to the bottom. Start where the list starts.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const keyString = getEventKeyString(e);
      // A bare modifier is not a shortcut; keep listening.
      if (['ctrl', 'meta', 'alt', 'shift'].includes(keyString)) return;

      if (keyString === 'escape') {
        setRecording(null);
        return;
      }

      // Collisions are only a problem inside the same context — 'n' can mean
      // two different things on two different screens.
      const contextBindings = shortcuts[recording.context] || {};
      const clash = Object.entries(contextBindings).find(
        ([action, key]) => key === keyString && action !== recording.action
      );

      if (clash) {
        setError(
          `"${keyString}" is already used for "${getShortcutLabel(recording.context, clash[0])}" here.`
        );
        setRecording(null);
        return;
      }

      setError('');
      setShortcut(recording.context, recording.action, keyString);
      setRecording(null);
    };

    // Capture phase, so recording a key never triggers the shortcut it is
    // about to become.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording, shortcuts, setShortcut]);

  // A shortcut the current role can never trigger is noise, not help.
  const visibleGroups = Object.entries(SHORTCUT_REGISTRY).filter(
    ([, group]) => !group.roles || group.roles.includes(user?.role)
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 font-display text-base font-semibold">
          <Keyboard className="h-5 w-5 text-primary" />
          Keyboard shortcuts
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          Click any key to rebind it. Shortcuts are ignored while you are typing in a text box, so
          they never interfere with charting.
        </DialogDescription>
      </DialogHeader>

        {error && (
          <Alert variant="destructive" className="shrink-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto py-2">
          {visibleGroups.map(([contextKey, group]) => (
            <div key={contextKey} className="space-y-2">
              <div>
                <h3 className="font-label text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
                {group.description && (
                  <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                    {group.description}
                  </p>
                )}
              </div>

              <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
                {Object.entries(group.items).map(([actionKey, item]) => {
                  const isRecording =
                    recording?.context === contextKey && recording?.action === actionKey;

                  return (
                    <div
                      key={actionKey}
                      className="flex items-center justify-between gap-4 bg-card px-3 py-2"
                    >
                      <span className="font-sans text-sm text-foreground">{item.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRecording(isRecording ? null : { context: contextKey, action: actionKey })
                        }
                        className={`shrink-0 rounded px-1 py-0.5 transition-colors hover:bg-muted ${
                          isRecording ? 'animate-pulse' : ''
                        }`}
                        aria-label={`Change shortcut for ${item.label}`}
                      >
                        {isRecording ? (
                          <span className="font-mono text-[11px] font-semibold text-primary">
                            Press a key… (Esc to cancel)
                          </span>
                        ) : (
                          <KeyCombo binding={shortcuts[contextKey]?.[actionKey]} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetToDefaults();
              setError('');
            }}
            className="text-muted-foreground"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
    </>
  );
}

export default function KeyboardShortcutsDialog() {
  const isHelpOpen = useShortcutStore((state) => state.isHelpOpen);
  const closeShortcutHelp = useShortcutStore((state) => state.closeShortcutHelp);

  return (
    <Dialog open={isHelpOpen} onOpenChange={(open) => !open && closeShortcutHelp()}>
      {/* The list is scrolled back to the top by ShortcutPanel on mount —
          moving focus into the dialog otherwise lands on a control near the
          bottom and opens the list part-way down. */}
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden bg-card">
        <ShortcutPanel onClose={closeShortcutHelp} />
      </DialogContent>
    </Dialog>
  );
}
