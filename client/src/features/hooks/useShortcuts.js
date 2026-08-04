import { useEffect, useRef } from 'react';
import { useShortcutStore } from '../store/shortcutStore';

export const getEventKeyString = (e) => {
  let key = e.key.toLowerCase();
  if (key === ' ') key = 'space';

  // Shift already lives inside the character for punctuation and digits: the
  // browser reports "?" for Shift+/, "!" for Shift+1. Prefixing "shift+" there
  // produces "shift+?", which matches nothing a user would ever bind — that is
  // exactly why the "?" shortcut silently did nothing. Letters keep the prefix,
  // since Shift+a reports "A" and would otherwise collide with plain "a".
  const shiftIsBakedIntoKey = key.length === 1 && !/[a-z]/.test(key);

  const keys = [];
  if (e.ctrlKey) keys.push('ctrl');
  if (e.metaKey) keys.push('meta');
  if (e.altKey) keys.push('alt');
  if (e.shiftKey && !shiftIsBakedIntoKey) keys.push('shift');

  // Prevent double adding of modifier keys if they are the primary key pressed
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) {
    keys.push(key);
  }

  return keys.join('+');
};

export function useShortcuts(context, actionsMap, options = { enabled: true }) {
  const shortcuts = useShortcutStore((state) => state.shortcuts[context]);
  const actionsRef = useRef(actionsMap);

  // Keep actionsRef fresh without causing re-renders/re-bindings
  useEffect(() => {
    actionsRef.current = actionsMap;
  }, [actionsMap]);

  useEffect(() => {
    if (!options.enabled) return;

    const handleKeyDown = (e) => {
      const target = e.target;
      
      // Strict input immunity: ignore keystrokes when typing in inputs/textareas
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const keyString = getEventKeyString(e);
      
      if (shortcuts) {
        for (const [action, mappedKey] of Object.entries(shortcuts)) {
          if (mappedKey === keyString && actionsRef.current[action]) {
            e.preventDefault();
            actionsRef.current[action](e);
            return; // Stop after first match
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [context, options.enabled, shortcuts]);
}
