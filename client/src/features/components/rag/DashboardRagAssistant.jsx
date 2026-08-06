import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Loader2,
  StopCircle,
  Trash2,
  Maximize2,
  AlertCircle,
  Database,
  Mic,
  Headphones,
  Volume2,
  AudioLines,
  Square,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useRagChat } from '../../hooks/useRagChat';
import { useVoiceAgent } from '../../hooks/useVoiceAgent';
import { useVoiceStore } from '@/store/voiceStore';
import { ragService } from '../../services/ragService';
import CitationList from './CitationList';
import VoiceSettingsPopover from './VoiceSettingsPopover';

const QUICK_PROMPTS = [
  'What changed in the last 24 hours?',
  'Which results are flagged abnormal?',
  'Any allergy conflicts with active medications?',
];

/**
 * Compact RAG assistant for the Resident and Specialist dashboards.
 *
 * Shares `useRagChat` with the full-page patient assistant and `useVoiceAgent`
 * with the Medical Knowledge Assistant, so all three surfaces behave
 * identically — same endpoints, same citation model, same error copy, and the
 * same voice preferences.
 */
export function DashboardRagAssistant({ admissions = [], activeAdmissionId, onSelectAdmission, isLoading }) {
  const navigate = useNavigate();
  const { autoSpeak } = useVoiceStore();
  const [question, setQuestion] = useState('');
  const [indexStatus, setIndexStatus] = useState(null);

  const selectedAdmission = useMemo(
    () => admissions.find((a) => a.id === activeAdmissionId) || null,
    [admissions, activeAdmissionId]
  );

  const {
    messages,
    isLoadingHistory,
    isAsking,
    elapsedSeconds,
    error,
    ask,
    cancel,
    clear,
  } = useRagChat(selectedAdmission?.id, { historyLimit: 10 });

  const scrollRef = useRef(null);
  // Whatever was typed before the microphone opened; dictation appends to it.
  const dictationBaseRef = useRef('');
  // The voice agent sends, and sending speaks the answer — one direction of
  // that cycle goes through a ref.
  const submitRef = useRef(() => {});

  const voice = useVoiceAgent({
    onUtterance: (text) => submitRef.current(text),
    onInterim: (text) =>
      setQuestion(dictationBaseRef.current ? `${dictationBaseRef.current} ${text}` : text),
  });

  // Knowledge-base state for the selected patient — tells the clinician up front
  // whether uploaded documents are actually searchable.
  useEffect(() => {
    let cancelled = false;
    setIndexStatus(null);

    if (!selectedAdmission?.id) return undefined;

    ragService
      .getIndexStatus(selectedAdmission.id)
      .then((data) => { if (!cancelled) setIndexStatus(data); })
      .catch(() => { if (!cancelled) setIndexStatus(null); });

    return () => { cancelled = true; };
  }, [selectedAdmission?.id]);

  useEffect(() => {
    const node = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') || scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isAsking]);

  const submit = useCallback(
    async (text) => {
      const value = String(text ?? question).trim();
      if (!value || isAsking || !selectedAdmission) {
        // A spoken question with nothing to ask it against would otherwise
        // leave hands-free waiting on a turn that never happened.
        voice.resumeIfHandsFree();
        return;
      }

      setQuestion('');
      dictationBaseRef.current = '';
      // Anything said from here belongs to the next turn, not this one.
      voice.stopListening();

      const result = await ask(value);

      if (result?.ai_response && (voice.getHandsFree() || autoSpeak)) {
        voice.speak(result.ai_response, result.id);
      } else {
        // Cancelled, failed, or nothing to read — reopen the microphone rather
        // than ending the conversation on a silent failure.
        voice.resumeIfHandsFree();
      }
    },
    [question, isAsking, selectedAdmission, ask, autoSpeak, voice]
  );

  useEffect(() => {
    submitRef.current = submit;
  });

  /** Push-to-talk dictation: the text lands in the box for review. */
  const handleMicToggle = useCallback(() => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    dictationBaseRef.current = question.trim();
    voice.startListening();
  }, [voice, question]);

  const handleToggleSpeech = useCallback(
    (message) => {
      if (voice.speakingId === message.id) voice.stopSpeaking();
      else voice.speak(message.text, message.id);
    },
    [voice]
  );

  const handleToggleHandsFree = useCallback(() => {
    dictationBaseRef.current = '';
    setQuestion('');
    voice.toggleHandsFree();
  }, [voice]);

  // Switching patients mid-conversation must not leave a spoken answer about
  // the previous one still playing, or the microphone open against a context
  // that has already changed.
  useEffect(() => {
    voice.setHandsFree(false);
    // Only the patient change should trigger this; `voice` is a fresh object
    // every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAdmission?.id]);

  const patientLabel = (admission) =>
    `${admission.patient?.name ?? 'Unknown patient'} (${admission.bed?.bed_number || 'No bed'})`;

  return (
    <Card className="rounded-[1.25rem] border-login-brand-ring bg-login-brand text-login-brand-foreground shadow-lg flex-1 flex flex-col min-h-[420px] overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-6 border-b border-login-brand-ring/40 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary-foreground border border-primary/30 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="font-display text-sm font-bold text-login-brand-foreground">
              SmartCare AI
            </CardTitle>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {voice.sttSupported && selectedAdmission && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleHandsFree}
              title={
                voice.handsFree
                  ? 'Turn off hands-free conversation'
                  : 'Hands-free: ask by voice, hear the answer, keep talking'
              }
              aria-label={
                voice.handsFree ? 'Turn off hands-free conversation' : 'Turn on hands-free conversation'
              }
              aria-pressed={voice.handsFree}
              className={`h-7 w-7 hover:bg-login-brand-ring/40 ${
                voice.handsFree
                  ? 'bg-primary/25 text-login-brand-foreground'
                  : 'text-login-brand-muted hover:text-login-brand-foreground'
              }`}
            >
              <Headphones className="h-3.5 w-3.5" />
            </Button>
          )}

          {(voice.ttsSupported || voice.sttSupported) && (
            <VoiceSettingsPopover
              voices={voice.voices}
              ttsSupported={voice.ttsSupported}
              onPreview={(text) => voice.speak(text, 'preview')}
              triggerClassName="h-7 w-7 text-login-brand-muted hover:text-login-brand-foreground hover:bg-login-brand-ring/40"
            />
          )}

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clear}
              title="Clear conversation"
              aria-label="Clear conversation"
              className="h-7 w-7 text-login-brand-muted hover:text-login-brand-foreground hover:bg-login-brand-ring/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {selectedAdmission && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/patients/${selectedAdmission.id}/ai-chat`)}
              title="Open the full assistant"
              aria-label="Open the full assistant"
              className="h-7 w-7 text-login-brand-muted hover:text-login-brand-foreground hover:bg-login-brand-ring/40"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-4 min-h-0">


        {isLoading ? (
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-3/4 rounded-lg bg-login-brand-ring/40" />
            <Skeleton className="h-16 w-5/6 rounded-lg bg-login-brand-ring/40" />
          </div>
        ) : !selectedAdmission ? (
          <div className="flex-1 flex items-center justify-center text-sm text-login-brand-muted font-sans text-center px-4">
            No active admissions to query. Admit a patient to start using the assistant.
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {isLoadingHistory ? (
              <div className="flex-1 space-y-3">
                <Skeleton className="h-10 w-2/3 ml-auto rounded-lg bg-login-brand-ring/40" />
                <Skeleton className="h-20 w-5/6 rounded-lg bg-login-brand-ring/40" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-start bg-login-brand-ring/20 p-4 rounded-lg border border-login-brand-ring/30 gap-3">
                <Badge
                  variant="outline"
                  className="bg-primary/20 text-login-brand-foreground border-primary/30 text-[10px] font-semibold"
                >
                  Grounded in this admission
                </Badge>
                <p className="font-sans text-sm text-login-brand-foreground leading-relaxed">
                  Ask about{' '}
                  <span className="font-semibold">{selectedAdmission.patient?.name ?? 'this patient'}</span>
                  's vitals, labs, medications, notes, or uploaded documents. Answers are drawn only
                  from this admission's record and cite their source.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submit(prompt)}
                      className="rounded-md border border-login-brand-ring/50 bg-login-brand/40 px-2 py-1 text-[11px] font-sans text-login-brand-muted transition-colors hover:bg-login-brand/70 hover:text-login-brand-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ScrollArea
                ref={scrollRef}
                className="flex-1 min-h-0 pr-3"
              >
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="font-sans text-[10px] text-login-brand-muted uppercase font-bold">
                          {message.role === 'user' ? 'You' : 'SmartCare AI'}
                        </span>
                        {message.role === 'assistant' && !message.isError && voice.ttsSupported && (
                          <button
                            type="button"
                            onClick={() => handleToggleSpeech(message)}
                            title={voice.speakingId === message.id ? 'Stop reading' : 'Read this answer aloud'}
                            aria-label={
                              voice.speakingId === message.id
                                ? 'Stop reading this answer'
                                : 'Read this answer aloud'
                            }
                            className={`inline-flex h-4 items-center gap-1 rounded px-1 text-[9px] transition-colors ${
                              voice.speakingId === message.id
                                ? 'text-primary'
                                : 'text-login-brand-muted hover:text-login-brand-foreground'
                            }`}
                          >
                            {voice.speakingId === message.id ? (
                              <AudioLines className="h-2.5 w-2.5 animate-pulse" />
                            ) : (
                              <Volume2 className="h-2.5 w-2.5" />
                            )}
                            {voice.speakingId === message.id ? 'Stop' : 'Listen'}
                          </button>
                        )}
                      </div>
                      <div
                        className={`p-3 rounded-lg text-sm max-w-[85%] font-sans leading-relaxed border ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground border-primary/20'
                            : message.isError
                            ? 'bg-destructive/15 text-login-brand-foreground border-destructive/40'
                            : 'bg-login-brand-ring/40 text-login-brand-foreground border-login-brand-ring/50'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        {message.role === 'assistant' && !message.isError && (
                          <CitationList citations={message.citations} variant="brand" />
                        )}
                      </div>
                    </div>
                  ))}

                  {isAsking && (
                    <div className="flex items-center gap-2 rounded-lg border border-login-brand-ring/50 bg-login-brand-ring/30 px-3 py-2 w-fit">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span className="font-sans text-xs text-login-brand-muted">
                        Searching the record…
                      </span>
                      <span className="font-tnum text-xs text-login-brand-muted">{elapsedSeconds}s</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancel}
                        title="Cancel"
                        aria-label="Cancel request"
                        className="h-5 w-5 text-login-brand-muted hover:text-destructive"
                      >
                        <StopCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Hands-free has no send button to watch, so the loop says
                      where it is. */}
                  {voice.isSpeaking && !isAsking && (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 w-fit">
                      <AudioLines className="h-3.5 w-3.5 animate-pulse text-primary" />
                      <span className="font-sans text-xs text-login-brand-muted">
                        Reading the answer…
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={voice.stopSpeaking}
                        title="Stop reading"
                        aria-label="Stop reading the answer"
                        className="h-5 w-5 text-login-brand-muted hover:text-destructive"
                      >
                        <Square className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 text-xs p-3 rounded-md font-sans">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {voice.micError && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 text-xs p-3 rounded-md font-sans">
                <Mic className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="flex-1">{voice.micError}</span>
                <button
                  type="button"
                  onClick={voice.dismissMicError}
                  className="shrink-0 underline underline-offset-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
              className="relative mt-auto"
            >
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={
                  voice.isListening
                    ? 'Listening — speak your question…'
                    : `Ask about ${selectedAdmission.patient?.name ?? 'this patient'}…`
                }
                disabled={isAsking}
                maxLength={2000}
                aria-label="Ask the AI assistant a question"
                className={`w-full bg-login-brand-ring/35 border-login-brand-ring/60 text-login-brand-foreground font-sans h-10 placeholder:text-login-brand-muted ${
                  voice.sttSupported ? 'pr-20' : 'pr-10'
                }`}
              />
              {voice.sttSupported && (
                <Button
                  type="button"
                  onClick={handleMicToggle}
                  size="icon"
                  variant="ghost"
                  title={voice.isListening ? 'Stop listening' : 'Dictate your question'}
                  aria-label={voice.isListening ? 'Stop listening' : 'Dictate your question'}
                  aria-pressed={voice.isListening}
                  className={`absolute right-10 top-1 h-8 w-8 hover:bg-login-brand-ring/50 ${
                    voice.isListening
                      ? 'bg-primary/25 text-login-brand-foreground animate-pulse'
                      : 'text-login-brand-muted hover:text-login-brand-foreground'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="submit"
                disabled={isAsking || !question.trim()}
                size="icon"
                variant="default"
                aria-label="Send question"
                className="absolute right-1 top-1 h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground border-transparent"
              >
                {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>

            {voice.isListening && (
              <p className="-mt-2 flex items-center gap-1.5 font-sans text-[10px] text-login-brand-muted">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                {voice.handsFree
                  ? 'Listening — stop speaking for a moment and your question sends itself.'
                  : 'Listening — press the microphone again to stop, then review before sending.'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardRagAssistant;
