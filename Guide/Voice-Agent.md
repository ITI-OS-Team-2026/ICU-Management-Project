# Voice Agent Guide

## Overview

The Voice Agent adds speech input and speech output to the AI assistants. A clinician can dictate a question instead of typing it, have answers read back, or hold a fully spoken conversation without touching the keyboard — the intended case being gloved hands at the bedside, where using a keyboard means breaking asepsis.

It runs entirely in the browser on the Web Speech API. There is **no server component, no database table, and no API endpoint** — the sections other guides devote to those do not apply here. Audio is captured, recognised, and synthesised on the clinician's own machine; the only thing that reaches the server is the same text question the keyboard would have produced, sent through the existing `POST /rag/query` path.

That boundary is deliberate. A bedside microphone picks up far more than the question — other clinicians, other patients, family members — and none of that should leave the device. It also means the feature costs nothing to run and needs no credentials: the ITI Bedrock proxy that backs the rest of the AI features exposes chat and embed endpoints only, with no speech service behind it.

---

## Where It Appears

Every AI assistant surface has it.

| Surface | Component | Scope of the questions |
| ------- | --------- | ---------------------- |
| Medical Knowledge Assistant (full page) | `MedicalAssistantPage.jsx` | The indexed knowledge base — not patient-specific |
| SmartCare AI Assistant (Resident / Specialist dashboard) | `DashboardRagAssistant.jsx` | The selected patient's admission record |
| AI Chat tab (patient detail) | `PatientRagChatPage.jsx` | That admission's record |

All three drive the same `useVoiceAgent` hook and the same preference store, so a voice and speed chosen on one surface applies to the others. The controls are identical in behaviour and differ only in styling — the dashboard card uses the brand palette and icon-only buttons for space, the two full pages use a labelled toggle and a composer microphone.

On both patient-scoped surfaces, hands-free switches itself off when the admission changes: an answer about the previous patient must not keep playing, and the microphone must not stay open against a record that has already moved.

---

## Modes

| Mode | Started by | Ends an utterance | Sends |
| ---- | ---------- | ----------------- | ----- |
| **Dictation** | Microphone button in the composer | Clinician presses the button again | Clinician reviews the text and presses send |
| **Hands-free** | `Hands-free` toggle in the page header | ~1.4 s of silence | Automatically |
| **Read aloud** | `Listen` on any answer, or the *Read answers aloud* setting | — | — |

Dictation appends to whatever was already typed rather than replacing it, so a half-written question can be finished by voice.

Hands-free is a loop: listen → detect the end of the utterance → send → speak the answer → listen again. Speaking while an answer is being read interrupts it, because opening the microphone always cancels synthesis first.

---

## Files

| File | Responsibility |
| ---- | -------------- |
| `client/src/features/hooks/useVoiceAgent.js` | Recognition and synthesis engines, mode state machine, error handling |
| `client/src/features/utils/speechText.js` | Turns a written answer into speakable prose; splits it into utterances |
| `client/src/store/voiceStore.js` | Persisted preferences (zustand + `persist`) |
| `client/src/features/components/rag/VoiceSettingsPopover.jsx` | Voice, speed and auto-speak controls |
| `client/src/features/pages/MedicalAssistantPage.jsx` | Wiring for the knowledge assistant |
| `client/src/features/components/rag/DashboardRagAssistant.jsx` | Wiring for the dashboard assistant |
| `client/src/features/pages/patient/PatientRagChatPage.jsx` | Wiring for the patient AI Chat tab |

---

## How It Works

### 1. Recognition (speech → text)

A single `SpeechRecognition` instance serves both modes, configured `continuous` with `interimResults` so the transcript can be rendered live into the composer as the clinician speaks.

Final and interim results are tracked separately. Only final results accumulate into the utterance; interim text is display-only and is replaced on every event.

**Detecting the end of a question.** Hands-free cannot wait for a button press, so it watches for silence: every recognition result resets a 1.4 s timer, and when that timer fires with non-empty final text, the utterance is closed and handed to the page to send. The value is a compromise — short enough that the assistant does not feel sluggish, long enough to survive someone pausing mid-sentence to read a value off a monitor.

**Session restarts.** Browsers end a recognition session on their own after a stretch of silence, which would otherwise make the microphone die without explanation. A `shouldRestart` flag records intent: it is set while the clinician wants to be listening and cleared only on an explicit stop, on a sent utterance, or on an unusable microphone. While it stands, `onend` reopens a session after a short delay, so silence is treated as a pause in the conversation rather than the end of it.

### 2. Text preparation (`speechText.js`)

Assistant answers are written to be read, not heard. Fed straight to a speech engine, the markdown scaffolding is pronounced literally — "asterisk asterisk", "bracket one bracket", entire URLs spelled out — which makes a clinically useful answer unlistenable.

`toSpeakableText()` removes:

| Written form | Spoken as |
| ------------ | --------- |
| `**bold**`, `*italic*`, `### heading` | the words alone |
| `[1]`, `[2, 3]` citation markers | removed, with the stranded space before punctuation closed up |
| `[label](https://…)` | the label |
| bare URLs | "link" |
| `` `code` `` | the words alone |
| fenced code blocks | "(code block omitted)" |
| bullet and numbered list markers | removed |
| table rows | cells read as a comma-separated list |

`chunkForSpeech()` then splits the result on sentence boundaries into pieces of at most 180 characters. This serves two purposes: Chrome silently truncates any single utterance running longer than roughly fifteen seconds, and short queued utterances give `cancel()` a fine-grained stopping point — which is what makes barge-in feel immediate instead of waiting out a paragraph.

### 3. Synthesis (text → speech)

Chunks are queued and played by a pump that advances on each `onend`. A generation counter guards the queue: cancelling increments it, so every in-flight `onend` from the cancelled answer becomes a no-op and cannot advance into the next chunk of something the clinician already stopped.

A 10 s keep-alive interval calls `resume()` while speech is in progress, working around Chrome suspending its synthesis queue during long answers.

The installed voice list differs per machine and per browser, and is populated asynchronously — it is read once and then followed via the `voiceschanged` event. A saved voice that the current machine does not have falls back to the platform default rather than failing.

---

## Preferences

Persisted to `localStorage` under `voice-agent-preferences-v1`.

| Field | Default | Notes |
| ----- | ------- | ----- |
| `autoSpeak` | `false` | Read every new answer aloud without being asked |
| `voiceURI` | `null` | Synthesis voice; `null` is the platform default |
| `rate` | `1.05` | Clamped to 0.5–2.0 |

`voiceURI` is stored rather than a voice object because `SpeechSynthesisVoice` entries are not serialisable and the list is rebuilt each browser session.

### Language

There is no language setting, by design. Both engines follow `navigator.language` (exported as `SPEECH_LANGUAGE`, falling back to `en-US`), which is already the language the clinician configured on the machine. A separate control added a way for the recogniser and the synthesiser to disagree with each other and with the browser, in exchange for a choice nobody needed to make twice.

The voice picker still filters to that locale, falling back to the full list when the filter would empty it.

---

## Browser Support

Recognition and synthesis are reported separately, because a browser can speak without being able to listen.

| Browser | Dictation / hands-free | Read aloud |
| ------- | ---------------------- | ---------- |
| Chrome, Edge | Yes | Yes |
| Firefox, Safari | No | Yes |

Where recognition is unavailable the microphone and hands-free controls are hidden rather than shown broken, and the info panel explains why. Recognition also requires a secure context — HTTPS, or `localhost` in development.

---

## Error Handling

| Cause | Behaviour |
| ----- | --------- |
| Permission denied / blocked | Message with the fix; hands-free switches off, since retrying cannot recover it |
| No microphone found | Message; hands-free switches off |
| Network failure | Message; the restart loop keeps trying |
| Silence (`no-speech`) | Treated as normal operation; the session restarts |
| Our own `stop()` (`aborted`) | Ignored |

A turn that produces nothing to read out — a cancelled request, a failed one, or an answer with no speakable content — reopens the microphone explicitly. Without that, the loop would end silently on the first error and look as though the agent had stopped listening for no reason.

Leaving the page cancels synthesis: the speech engine is global to the tab, so an unfinished answer would otherwise keep reading over whatever the clinician opened next.

---

## Flow Diagram

```
Hands-free enabled
            |
    Microphone opens (synthesis cancelled first)
            |
    Interim results stream into the composer
            |
    1.4s of silence with final text present
            |
    Microphone closes, utterance handed to the page
            |
    POST /rag/query  (mode: "knowledge")  <-- identical to a typed question
            |
    Answer returns
            |
    Strip markdown / citations / URLs
            |
    Split into <=180 char utterances
            |
    Queue and speak (keep-alive resume every 10s)
            |
    Queue drains -> microphone reopens
            |
    (loop, until the clinician turns hands-free off)
```

---

## Reuse

`useVoiceAgent` is surface-agnostic — it knows nothing about chats, admissions or endpoints. Wiring it into a new one is four connections:

```js
const voice = useVoiceAgent({
  onUtterance: (text) => submitRef.current(text),   // hands-free finished a question
  onInterim:   (text) => setQuestion(text),         // live transcript for the composer
});

// in the submit handler, after the answer returns:
voice.stopListening();
const result = await ask(value);
if (result?.ai_response && (voice.getHandsFree() || autoSpeak)) {
  voice.speak(result.ai_response, result.id);
} else {
  voice.resumeIfHandsFree();                        // never end the loop on a silent failure
}
```

`getHandsFree()` is read rather than the `handsFree` value from render, because a request takes seconds and the toggle may have been switched off while it was in flight.

A patient-scoped surface adds one more effect — resetting hands-free when the admission changes, as described under *Where It Appears*.

---

## Verification Notes

Speech playback and recognition need a real Chrome or Edge session with a microphone and installed system voices — headless and embedded browsers typically report the APIs as present while having zero voices and no capture device, so they exercise the code paths but produce no audio.
