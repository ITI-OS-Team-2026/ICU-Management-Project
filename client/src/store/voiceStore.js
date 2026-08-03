import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Voice agent preferences, shared by every surface that speaks or listens.
 *
 * Persisted because these are ergonomic choices a clinician makes once — which
 * voice, how fast — and re-picking them every shift would defeat the point of a
 * hands-free mode.
 *
 * `voiceURI` is stored rather than a voice object: the SpeechSynthesisVoice
 * list is rebuilt per browser session and its entries are not serialisable, so
 * the URI is resolved against the live list at speak time and falls back to the
 * platform default when that voice is not installed on this machine.
 *
 * Note there is no language setting. The recogniser and the synthesiser both
 * follow the browser's own locale, which is already the language the clinician
 * chose when they set up the machine — asking a second time only creates a way
 * for the two to disagree.
 */

export const useVoiceStore = create(
  persist(
    (set) => ({
      /** Read every new answer aloud without being asked. */
      autoSpeak: false,
      /** Preferred synthesis voice, by URI. Null = platform default. */
      voiceURI: null,
      /** Speech rate. 1 is the engine default; clinical prose reads well slightly faster. */
      rate: 1.05,

      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
      setVoiceURI: (voiceURI) => set({ voiceURI }),
      setRate: (rate) => set({ rate: Math.min(2, Math.max(0.5, Number(rate) || 1)) }),
    }),
    {
      name: 'voice-agent-preferences-v1',
    }
  )
);
