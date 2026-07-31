import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ragService } from '../../services/ragService';
import CitationList from './CitationList';

const QUICK_PROMPTS = [
  'What changed in the last 24 hours?',
  'Which results are flagged abnormal?',
  'Any allergy conflicts with active medications?',
];

/**
 * Compact RAG assistant for the Resident and Specialist dashboards.
 *
 * Shares `useRagChat` with the full-page patient assistant, so the two surfaces
 * behave identically — same endpoints, same citation model, same error copy.
 */
export function DashboardRagAssistant({ admissions = [], activeAdmissionId, onSelectAdmission, isLoading }) {
  const navigate = useNavigate();
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

  const submit = async (text) => {
    const value = String(text ?? question).trim();
    if (!value || isAsking || !selectedAdmission) return;
    setQuestion('');
    await ask(value);
  };

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
              SmartCare AI Assistant
            </CardTitle>
            <span className="font-sans text-[10px] text-login-brand-muted mt-0.5 block">
              Retrieval-augmented · answers cite the record they came from
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
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

      <CardContent className="flex-1 flex flex-col p-6 gap-4">
        {/* Patient context selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-login-brand-ring/30 p-3 rounded-lg border border-login-brand-ring/40">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-sans text-xs font-semibold text-login-brand-muted">
              Query Context:
            </span>
            {indexStatus && (
              <span className="flex items-center gap-1 font-sans text-[10px] text-login-brand-muted">
                <Database className="h-2.5 w-2.5" />
                {indexStatus.counts.total === 0
                  ? 'Clinical records only — no documents uploaded'
                  : `${indexStatus.indexed_chunks} indexed passage${
                      indexStatus.indexed_chunks === 1 ? '' : 's'
                    } from ${indexStatus.counts.completed}/${indexStatus.counts.total} document${
                      indexStatus.counts.total === 1 ? '' : 's'
                    }`}
              </span>
            )}
          </div>

          <div className="w-full sm:w-64 shrink-0">
            <Select value={activeAdmissionId || ''} onValueChange={onSelectAdmission}>
              <SelectTrigger className="w-full h-8 bg-login-brand border-login-brand-ring/60 text-xs font-sans">
                <SelectValue placeholder="Select patient…">
                  {selectedAdmission ? patientLabel(selectedAdmission) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-login-brand text-login-brand-foreground border-login-brand-ring">
                {admissions.map((a) => (
                  <SelectItem
                    key={a.id}
                    value={a.id}
                    className="text-xs font-sans focus:bg-login-brand-ring focus:text-login-brand-foreground"
                  >
                    {patientLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
                className="flex-1 max-h-[320px] bg-login-brand-ring/10 p-3 rounded-lg border border-login-brand-ring/25"
              >
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <span className="font-sans text-[10px] text-login-brand-muted mb-1 uppercase font-bold">
                        {message.role === 'user' ? 'You' : 'SmartCare AI'}
                      </span>
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
                </div>
              </ScrollArea>
            )}

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 text-xs p-3 rounded-md font-sans">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
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
                placeholder={`Ask about ${selectedAdmission.patient?.name ?? 'this patient'}…`}
                disabled={isAsking}
                maxLength={2000}
                aria-label="Ask the AI assistant a question"
                className="w-full bg-login-brand-ring/35 border-login-brand-ring/60 text-login-brand-foreground pr-10 font-sans h-10 placeholder:text-login-brand-muted"
              />
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DashboardRagAssistant;
