import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '@/store/voiceStore';
import { chunkForSpeech, toSpeakableText } from '../utils/speechText';

/**
 * Voice layer for the Medical Assistant — speech in, speech out.
 *
 * Everything runs in the browser (Web Speech API): no audio is uploaded, no
 * speech vendor is involved, and the only thing that reaches the server is the
 * same text question the keyboard would have produced. That is deliberate for a
 * clinical setting — a bedside microphone picks up far more than the question.
 *
 * Two modes share one recogniser:
 *
 *   Dictation  — press the mic, talk, text streams into the composer, press
 *                again to stop. The clinician still reviews and sends it.
 *   Hands-free — the loop: listen → detect the end of the utterance → hand it
 *                to the caller to send → speak the answer → listen again. For
 *                gloved hands at the bedside, where touching a keyboard means
 *                breaking asepsis.
 *
 * @param {Object}   options
 * @param {Function} options.onUtterance — hands-free only: a completed spoken
 *                   question, ready to send. Dictation never calls this.
 * @param {Function} options.onInterim   — live transcript (final + in-progress)
 *                   while dictating, for rendering into the composer.
 */

const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export const isSpeechRecognitionSupported = Boolean(Recognition);
export const isSpeechSynthesisSupported = Boolean(synthesis);

/**
 * The locale both engines work in. Taken from the browser rather than offered
 * as a setting: it is already the language the clinician configured on this
 * machine, and a separate control would only let the two disagree.
 */
export const SPEECH_LANGUAGE =
  (typeof navigator !== 'undefined' && navigator.language) || 'en-US';

/**
 * How long a pause ends the question in hands-free mode. Short enough that the
 * assistant does not feel slow, long enough to survive someone thinking
 * mid-sentence or reading a value off a monitor.
 */
const SILENCE_MS = 1400;

/** Chrome refuses `start()` until the previous session has fully torn down. */
const RESTART_DELAY_MS = 300;

/** Human-readable causes for the recogniser's error codes. */
const MIC_ERRORS = {
  'not-allowed':
    'Microphone access is blocked. Allow it for this site in your browser settings, then try again.',
  'service-not-allowed':
    'Microphone access is blocked. Allow it for this site in your browser settings, then try again.',
  'audio-capture': 'No microphone was found. Check that one is connected and enabled.',
  network: 'Speech recognition needs a network connection and could not reach the service.',
};

export function useVoiceAgent({ onUtterance, onInterim } = {}) {
  const { voiceURI, rate } = useVoiceStore();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Which message is being read, so only that bubble shows a stop button.
  const [speakingId, setSpeakingId] = useState(null);
  const [handsFree, setHandsFreeState] = useState(false);
  const [micError, setMicError] = useState(null);
  const [voices, setVoices] = useState([]);

  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const handsFreeRef = useRef(false);
  // Set while we intend the recogniser to keep running: `onend` fires both when
  // we stop it and when the browser drops the session on its own, and only the
  // second case should restart.
  const shouldRestartRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const restartTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // A queue that outlives its utterances: bumping the generation makes every
  // in-flight `onend` a no-op, which is what stops a cancelled answer from
  // resuming halfway through the next one.
  const speechQueueRef = useRef([]);
  const speechIndexRef = useRef(0);
  const speechGenerationRef = useRef(0);
  const keepAliveRef = useRef(null);

  // Callbacks live in refs so re-rendering the page does not tear down and
  // rebuild the recogniser mid-sentence.
  const onUtteranceRef = useRef(onUtterance);
  const onInterimRef = useRef(onInterim);
  useEffect(() => {
    onUtteranceRef.current = onUtterance;
    onInterimRef.current = onInterim;
  });

  // ── Synthesis voices ──────────────────────────────────────────────────────
  // The list is populated asynchronously, and on some builds only after the
  // first `getVoices()` call, so read it once and then follow the event.
  useEffect(() => {
    if (!synthesis) return undefined;

    const readVoices = () => setVoices(synthesis.getVoices() || []);
    readVoices();
    synthesis.addEventListener?.('voiceschanged', readVoices);

    return () => synthesis.removeEventListener?.('voiceschanged', readVoices);
  }, []);

  // ── Speaking ──────────────────────────────────────────────────────────────

  const clearKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const stopSpeaking = useCallback(() => {
    if (!synthesis) return;

    // Invalidate the queue before cancelling: `cancel()` fires `onend` on the
    // current utterance, and without this the pump would advance into the next
    // chunk of the answer we were just asked to stop reading.
    speechGenerationRef.current += 1;
    speechQueueRef.current = [];
    speechIndexRef.current = 0;
    clearKeepAlive();
    synthesis.cancel();
    setIsSpeaking(false);
    setSpeakingId(null);
  }, []);

  // `startListening` and the speech pump each need to trigger the other, so one
  // of the two is reached through a ref to break the definition cycle.
  const startListeningRef = useRef(() => {});

  const speak = useCallback(
    (text, messageId = null) => {
      if (!synthesis) return;

      const chunks = chunkForSpeech(toSpeakableText(text));
      if (chunks.length === 0) {
        // Nothing sayable (an empty or purely structural answer) — in hands-free
        // that must not strand the loop waiting for a speech end that never comes.
        if (handsFreeRef.current) startListeningRef.current();
        return;
      }

      // The recogniser must be off before the speaker comes on, or the answer
      // is transcribed as the next question.
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();

      stopSpeaking();
      const generation = (speechGenerationRef.current += 1);
      speechQueueRef.current = chunks;
      speechIndexRef.current = 0;
      setIsSpeaking(true);
      setSpeakingId(messageId);

      const selectedVoice = voiceURI ? voices.find((v) => v.voiceURI === voiceURI) : null;

      const pump = () => {
        if (generation !== speechGenerationRef.current) return;

        const index = speechIndexRef.current;
        if (index >= speechQueueRef.current.length) {
          clearKeepAlive();
          setIsSpeaking(false);
          setSpeakingId(null);
          // The answer has been read; hand the microphone back.
          if (handsFreeRef.current) startListeningRef.current();
          return;
        }

        speechIndexRef.current = index + 1;

        const utterance = new SpeechSynthesisUtterance(speechQueueRef.current[index]);
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.lang = selectedVoice?.lang || SPEECH_LANGUAGE;
        utterance.rate = rate;
        utterance.onend = pump;
        utterance.onerror = (event) => {
          // `interrupted` and `canceled` are our own `cancel()` coming back
          // around — the generation check above already handled those.
          if (event.error !== 'interrupted' && event.error !== 'canceled') {
            console.error('Speech synthesis failed:', event.error);
          }
          if (generation === speechGenerationRef.current) {
            clearKeepAlive();
            setIsSpeaking(false);
            setSpeakingId(null);
          }
        };

        synthesis.speak(utterance);
      };

      // Chrome suspends the synthesis queue after roughly fifteen seconds of
      // continuous speech; a periodic resume keeps a long answer running.
      clearKeepAlive();
      keepAliveRef.current = setInterval(() => {
        if (synthesis.speaking && !synthesis.paused) synthesis.resume();
      }, 10_000);

      pump();
    },
    [voices, voiceURI, rate, stopSpeaking]
  );

  // ── Listening ─────────────────────────────────────────────────────────────

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  /** Close the current utterance and hand it to the caller to send. */
  const submitUtterance = useCallback(() => {
    clearSilenceTimer();

    const text = finalTranscriptRef.current.trim();
    finalTranscriptRef.current = '';
    if (!text) return;

    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    onUtteranceRef.current?.(text);
  }, []);

  const buildRecognition = useCallback(() => {
    const recognition = new Recognition();
    recognition.lang = SPEECH_LANGUAGE;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listeningRef.current = true;
      setIsListening(true);
      setMicError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
        } else {
          interim += transcript;
        }
      }

      const live = `${finalTranscriptRef.current} ${interim}`.trim();
      onInterimRef.current?.(live);

      // In hands-free the pause *after* speech is the send signal, so the timer
      // restarts on every result and only fires once the clinician stops.
      if (handsFreeRef.current) {
        clearSilenceTimer();
        if (finalTranscriptRef.current) {
          silenceTimerRef.current = setTimeout(submitUtterance, SILENCE_MS);
        }
      }
    };

    recognition.onerror = (event) => {
      // Silence and our own `stop()` are part of normal operation, not faults.
      if (event.error === 'no-speech' || event.error === 'aborted') return;

      const message = MIC_ERRORS[event.error] || 'Speech recognition failed. Try again.';
      setMicError(message);

      // A blocked or missing microphone cannot be recovered by retrying, so
      // leave hands-free rather than looping on the same failure.
      if (event.error !== 'network') {
        shouldRestartRef.current = false;
        handsFreeRef.current = false;
        setHandsFreeState(false);
      }
    };

    recognition.onend = () => {
      listeningRef.current = false;
      setIsListening(false);

      // Browsers end the session on their own after a stretch of silence, in
      // both modes. `shouldRestart` is the record of intent: it is only cleared
      // when the clinician stops the microphone, when an utterance has been
      // sent, or when the microphone is unusable — so while it stands, silence
      // is a pause in the conversation rather than the end of it.
      if (shouldRestartRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldRestartRef.current && !listeningRef.current) {
            try {
              recognitionRef.current?.start();
            } catch {
              // Already restarting; the next `onend` will retry.
            }
          }
        }, RESTART_DELAY_MS);
      }
    };

    return recognition;
  }, [submitUtterance]);

  const startListening = useCallback(() => {
    if (!Recognition) return;

    // Talking over the assistant should interrupt it, not compete with it.
    stopSpeaking();

    finalTranscriptRef.current = '';
    setMicError(null);

    if (!recognitionRef.current) recognitionRef.current = buildRecognition();

    // Arm the restart path *before* attempting to start. A session that is
    // still winding down — hands-free stops the microphone to speak, and a
    // short answer finishes before `onend` has fired — would otherwise swallow
    // this call and leave the loop waiting on a microphone nobody reopened.
    shouldRestartRef.current = true;
    if (listeningRef.current) return;

    try {
      recognitionRef.current.start();
    } catch {
      // Not yet torn down; `onend` picks it up from here.
    }
  }, [buildRecognition, stopSpeaking]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  const toggleListening = useCallback(() => {
    if (listeningRef.current) stopListening();
    else startListening();
  }, [startListening, stopListening]);

  // ── Hands-free ────────────────────────────────────────────────────────────

  const setHandsFree = useCallback(
    (enabled) => {
      handsFreeRef.current = enabled;
      setHandsFreeState(enabled);

      if (enabled) {
        startListening();
      } else {
        stopListening();
        stopSpeaking();
        finalTranscriptRef.current = '';
      }
    },
    [startListening, stopListening, stopSpeaking]
  );

  const toggleHandsFree = useCallback(() => setHandsFree(!handsFreeRef.current), [setHandsFree]);

  /**
   * Re-open the microphone after a turn that produced nothing to read out — a
   * failed or cancelled request. Without it the loop would end silently on the
   * first error and look like the agent had stopped listening for no reason.
   */
  const resumeIfHandsFree = useCallback(() => {
    if (handsFreeRef.current && !listeningRef.current) startListening();
  }, [startListening]);

  // ── Teardown ──────────────────────────────────────────────────────────────

  useEffect(
    () => () => {
      clearSilenceTimer();
      clearKeepAlive();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      shouldRestartRef.current = false;
      handsFreeRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      // Synthesis is global to the tab: leaving the page mid-answer would
      // otherwise keep reading over whatever the clinician opened next.
      speechGenerationRef.current += 1;
      synthesis?.cancel();
    },
    []
  );

  return {
    // Capability — reported separately because a browser can speak without
    // being able to listen (Firefox and Safari both do).
    sttSupported: isSpeechRecognitionSupported,
    ttsSupported: isSpeechSynthesisSupported,

    isListening,
    micError,
    dismissMicError: () => setMicError(null),
    startListening,
    stopListening,
    toggleListening,

    isSpeaking,
    speakingId,
    speak,
    stopSpeaking,

    handsFree,
    setHandsFree,
    toggleHandsFree,
    resumeIfHandsFree,
    // Read at the moment of use rather than from a render-time closure: a
    // request takes seconds, and hands-free may have been switched off while
    // it was in flight — in which case the answer must not be read aloud.
    getHandsFree: () => handsFreeRef.current,

    voices,
  };
}
