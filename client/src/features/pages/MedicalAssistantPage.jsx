import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  StopCircle,
  PanelLeft,
  Plus,
  Paperclip,
  Mic,
  Square,
  Volume2,
  AudioLines,
  Headphones,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { useKnowledgeChats } from '../hooks/useKnowledgeChats';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { useVoiceStore } from '@/store/voiceStore';
import CitationList from '../components/rag/CitationList';
import ChatHistorySidebar from '../components/rag/ChatHistorySidebar';
import ChatResourceBar from '../components/rag/ChatResourceBar';
import MessageAttachments from '../components/rag/MessageAttachments';
import ImageLightbox from '../components/rag/ImageLightbox';
import VoiceSettingsPopover from '../components/rag/VoiceSettingsPopover';

// Mirrors the server's upload filter (middlewares/uploadSingleFile.js).
const ACCEPTED_FILE_TYPES = '.pdf,.txt,.png,.jpg,.jpeg';

const KNOWLEDGE_PROMPTS = [
  'What are the key elements to cover in a patient\'s present history of illness?',
  'What occupational hazards cause chest diseases?',
  'What should be included in a focused clinical examination for respiratory assessment?',
  'How do you classify cyanosis and what does it indicate?',
  'What is the pathophysiology of acute decompensated heart failure?',
];

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function ChatBubble({
  message,
  chatId,
  attachments,
  onOpenImage,
  canSpeak,
  isSpeaking,
  onToggleSpeech,
}) {
  const isUser = message.role === 'user';
  // document_chunks_retrieved counts what retrieval found, not what the model
  // actually used — a weak match can be retrieved and still go uncited if the
  // model judged it irrelevant and answered from general knowledge instead.
  // Whether a document chunk was actually cited is the accurate "grounded"
  // signal — the synthetic "general_knowledge" source is also `cited: true`,
  // so it must be excluded here or every answer would read as grounded.
  const isGrounded =
    Array.isArray(message.citations) &&
    message.citations.some((c) => c.cited && c.type === 'document_chunk');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isUser ? 'You' : 'Medical Assistant'}
          </span>
          {!isUser && !message.isError && message.retrieval && (
            <Badge
              variant="outline"
              className={`h-4 px-1.5 text-[9px] font-normal normal-case ${
                isGrounded
                  ? 'border-primary/30 text-primary'
                  : 'border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isGrounded ? 'Knowledge base' : 'General AI knowledge'}
            </Badge>
          )}
          {!isUser && !message.isError && canSpeak && (
            <button
              type="button"
              onClick={() => onToggleSpeech(message)}
              title={isSpeaking ? 'Stop reading' : 'Read this answer aloud'}
              aria-label={isSpeaking ? 'Stop reading this answer' : 'Read this answer aloud'}
              className={`inline-flex h-4 items-center gap-1 rounded px-1 text-[9px] transition-colors ${
                isSpeaking
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isSpeaking ? <AudioLines size={11} className="animate-pulse" /> : <Volume2 size={11} />}
              {isSpeaking ? 'Stop' : 'Listen'}
            </button>
          )}
        </div>
        <div
          className={`p-3.5 rounded-2xl ${
            isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
          } border text-sm font-sans leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground border-primary/20'
              : message.isError
              ? 'bg-destructive/15 text-destructive border-destructive/40'
              : 'bg-card text-foreground border-border'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>

          <MessageAttachments
            chatId={chatId}
            attachments={attachments}
            onOpenImage={onOpenImage}
          />

          {!isUser && !message.isError && <CitationList citations={message.citations} />}
        </div>
        {message.createdAt && (
          <p className={`mt-1 font-tnum text-[10px] text-muted-foreground ${isUser ? 'text-right' : ''}`}>
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MedicalAssistantPage() {
  const {
    chats,
    isLoadingChats,
    activeChatId,
    messages,
    isLoadingMessages,
    isAsking,
    elapsedSeconds,
    error,
    stagedResources,
    resourcesByMessage,
    uploadingFile,
    isPreparingFiles,
    preparingFileNames,
    ask,
    cancel,
    openChat,
    startNewChat,
    renameChat,
    deleteChat,
    deleteAllChats,
    attachResource,
    removeResource,
    dismissError,
  } = useKnowledgeChats();

  const { autoSpeak } = useVoiceStore();

  const [question, setQuestion] = useState('');
  // The rail is permanent from `lg` up; below that it is a togglable panel.
  const [showHistory, setShowHistory] = useState(false);
  const [lightboxResource, setLightboxResource] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  // Whatever was typed before the microphone opened. Dictation appends to it
  // rather than overwriting a half-written question.
  const dictationBaseRef = useRef('');
  // The voice agent has to be able to send, and sending has to be able to
  // speak the answer — one of the two references the other through a ref.
  const submitRef = useRef(() => {});

  const voice = useVoiceAgent({
    onUtterance: (text) => submitRef.current(text),
    onInterim: (text) =>
      setQuestion(dictationBaseRef.current ? `${dictationBaseRef.current} ${text}` : text),
  });

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isAsking]);

  const submitQuestion = useCallback(
    async (text) => {
      const value = String(text ?? question).trim();
      // Hold the question until every attached file is uploaded AND indexed:
      // asking sooner means the assistant cannot read the file it was given.
      if (!value || isAsking || isPreparingFiles) {
        // A spoken question that arrives too early would otherwise vanish and
        // leave hands-free waiting on a turn that never happened.
        voice.resumeIfHandsFree();
        return;
      }

      setQuestion('');
      dictationBaseRef.current = '';
      // Stop transcribing while the answer is being fetched — anything said
      // now belongs to the next turn, not this one.
      voice.stopListening();

      const result = await ask(value);

      if (result?.ai_response && (voice.getHandsFree() || autoSpeak)) {
        voice.speak(result.ai_response, result.id);
      } else {
        // Cancelled, failed, or nothing to read — reopen the microphone so the
        // conversation can continue instead of ending on a silent failure.
        voice.resumeIfHandsFree();
      }

      inputRef.current?.focus();
    },
    [question, isAsking, isPreparingFiles, ask, autoSpeak, voice]
  );

  useEffect(() => {
    submitRef.current = submitQuestion;
  });

  /** Push-to-talk dictation: the text lands in the composer for review. */
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

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  };

  const handleSelectChat = (chatId) => {
    openChat(chatId);
    setShowHistory(false);
  };

  const handleNewChat = () => {
    startNewChat();
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const handleFilePicked = async (event) => {
    const file = event.target.files?.[0];
    // Reset first so picking the same file twice still fires a change event.
    event.target.value = '';
    if (file) await attachResource(file);
  };

  const isEmpty = messages.length === 0 && !isLoadingMessages;

  return (
    <div className="p-4 sm:p-6 max-w-[110rem] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Saved chats ────────────────────────────────────────────────── */}
        <div
          className={`${
            showHistory ? 'block' : 'hidden'
          } lg:block lg:col-span-3 h-[calc(100vh-7rem)] min-h-[520px]`}
        >
          <ChatHistorySidebar
            chats={chats}
            activeChatId={activeChatId}
            isLoading={isLoadingChats}
            onSelect={handleSelectChat}
            onNewChat={handleNewChat}
            onRename={renameChat}
            onDelete={deleteChat}
            onDeleteAll={deleteAllChats}
            onClose={() => setShowHistory(false)}
          />
        </div>

        {/* ── Conversation ───────────────────────────────────────────────── */}
        <div className={`${showHistory ? 'hidden' : 'flex'} lg:flex lg:col-span-9 flex-col rounded-xl border border-border bg-card shadow-sm h-[calc(100vh-7rem)] min-h-[520px] overflow-hidden`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistory((open) => !open)}
                title="Saved chats"
                aria-label="Toggle saved chats"
                aria-expanded={showHistory}
                className="h-8 w-8 shrink-0 lg:hidden"
              >
                <PanelLeft size={15} />
              </Button>

              <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles size={17} />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {voice.sttSupported && (
                <Button
                  variant={voice.handsFree ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleHandsFree}
                  title={
                    voice.handsFree
                      ? 'Turn off hands-free conversation'
                      : 'Hands-free: ask by voice, hear the answer, keep talking'
                  }
                  aria-pressed={voice.handsFree}
                  className="h-8 gap-1.5"
                >
                  <Headphones size={13} />
                  <span className="hidden sm:inline">
                    {voice.handsFree ? 'Hands-free on' : 'Hands-free'}
                  </span>
                </Button>
              )}

              {(voice.ttsSupported || voice.sttSupported) && (
                <VoiceSettingsPopover
                  voices={voice.voices}
                  ttsSupported={voice.ttsSupported}
                  onPreview={(text) => voice.speak(text, 'preview')}
                />
              )}

              {(messages.length > 0 || activeChatId) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="h-8 gap-1.5"
                >
                  <Plus size={13} />
                  <span className="hidden sm:inline">New chat</span>
                </Button>
              )}
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className={`flex-1 overflow-y-auto ${isEmpty ? 'p-4 sm:p-6' : 'px-4 py-4 space-y-5'}`}>
            {isLoadingMessages ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-2/3 ml-auto rounded-2xl" />
                <Skeleton className="h-24 w-4/5 rounded-2xl" />
                <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
              </div>
            ) : isEmpty ? (
              <div className="flex h-full flex-col justify-end animate-in fade-in duration-700 pb-4">
                <div className="w-full">
                  <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.1] font-medium tracking-tight text-foreground mb-6">
                    What are we<br/>building today?
                  </h2>
                  <div className="flex overflow-x-auto snap-x space-x-3 pb-4 no-scrollbar w-full max-w-full">
                    {KNOWLEDGE_PROMPTS.map((prompt, i) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => submitQuestion(prompt)}
                        disabled={isAsking || isPreparingFiles}
                        className="snap-start shrink-0 w-64 h-32 flex flex-col justify-between rounded-[24px] bg-muted/30 border border-border p-5 text-left transition-all hover:bg-muted/60 disabled:opacity-50"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <Sparkles size={18} className="text-primary" fill="currentColor" />
                        <span className="font-sans text-[15px] font-medium leading-snug text-foreground/90 line-clamp-3">
                          {prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  chatId={activeChatId}
                  // Live list wins; the message's own snapshot covers the brief
                  // window before the server confirms the send.
                  attachments={resourcesByMessage[message.id] ?? message.attachments}
                  onOpenImage={setLightboxResource}
                  canSpeak={voice.ttsSupported}
                  isSpeaking={voice.speakingId === message.id}
                  onToggleSpeech={handleToggleSpeech}
                />
              ))
            )}

            {/* Hands-free has no send button to watch, so the loop says where
                it is: listening, or reading the answer back. */}
            {voice.isSpeaking && !isAsking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-primary/30 bg-primary/5 px-3.5 py-2.5">
                  <AudioLines size={14} className="animate-pulse text-primary" />
                  <span className="font-sans text-xs text-muted-foreground">Reading the answer…</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={voice.stopSpeaking}
                    title="Stop reading"
                    aria-label="Stop reading the answer"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <Square size={11} />
                  </Button>
                </div>
              </div>
            )}

            {isAsking && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-border bg-muted/40 px-3.5 py-2.5">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span className="font-sans text-xs text-muted-foreground">
                    Searching medical knowledge base…
                  </span>
                  <span className="font-tnum text-xs text-muted-foreground">{elapsedSeconds}s</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancel}
                    title="Cancel"
                    aria-label="Cancel request"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <StopCircle size={13} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3 shrink-0">
            {error && (
              <Alert variant="destructive" className="mb-2 py-2">
                <AlertCircle size={14} />
                <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={dismissError}
                    className="shrink-0 underline underline-offset-2"
                  >
                    Dismiss
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {voice.micError && (
              <Alert variant="destructive" className="mb-2 py-2">
                <Mic size={14} />
                <AlertDescription className="flex items-center justify-between gap-2 text-xs">
                  <span>{voice.micError}</span>
                  <button
                    type="button"
                    onClick={voice.dismissMicError}
                    className="shrink-0 underline underline-offset-2"
                  >
                    Dismiss
                  </button>
                </AlertDescription>
              </Alert>
            )}

            <ChatResourceBar
              chatId={activeChatId}
              resources={stagedResources}
              uploadingFile={uploadingFile}
              onRemove={removeResource}
            />

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 p-2 sm:p-1.5 rounded-2xl sm:rounded-[32px] mx-auto w-full max-w-4xl bg-muted/40 border border-border">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFilePicked}
                className="hidden"
                tabIndex={-1}
              />
              
              <div className="flex-1 w-full order-1 sm:order-2">
                <Textarea
                  ref={inputRef}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  maxLength={2000}
                  disabled={isAsking}
                  placeholder={
                    voice.isListening
                      ? 'Listening...'
                      : 'Ask AI a question'
                  }
                  aria-label="Ask the medical assistant a question"
                  className="w-full min-h-[44px] max-h-32 resize-y font-sans text-[16px] border-0 shadow-none focus-visible:ring-0 bg-transparent px-2 py-3 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex justify-between items-center w-full sm:w-auto sm:contents order-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={Boolean(uploadingFile)}
                  title="Attach a file to this chat"
                  aria-label="Attach a file to this chat"
                  className="sm:order-1 h-[44px] w-[44px] rounded-full shrink-0 text-muted-foreground hover:bg-muted/50"
                >
                  {uploadingFile ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Paperclip size={20} />
                  )}
                </Button>

                <div className="sm:order-3 shrink-0">
                  {!question.trim() && voice.sttSupported ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleMicToggle}
                      title={voice.isListening ? 'Stop listening' : 'Dictate your question'}
                      aria-label={voice.isListening ? 'Stop listening' : 'Dictate your question'}
                      aria-pressed={voice.isListening}
                      className={`h-[44px] w-[44px] rounded-full shrink-0 transition-colors text-muted-foreground hover:bg-muted/50 ${voice.isListening ? 'animate-pulse bg-destructive hover:bg-destructive/90 text-destructive-foreground hover:text-destructive-foreground' : ''}`}
                    >
                      <Mic size={20} />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isAsking || isPreparingFiles || !question.trim()}
                      title={isPreparingFiles ? 'Waiting for the attached file to finish preparing…' : undefined}
                      aria-label="Send question"
                      className={`h-[44px] w-[44px] rounded-full shrink-0 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 ${!question.trim() ? 'opacity-50' : ''}`}
                    >
                      {isAsking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={isEmpty ? 'ml-0.5' : ''} />}
                    </Button>
                  )}
                </div>
              </div>
            </form>

            {voice.isListening ? (
              // A live microphone is invisible otherwise, and the two modes end
              // an utterance differently — say which one is running.
              <p className="mt-1.5 flex items-center gap-1.5 font-sans text-[10px] text-primary">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span>
                  {voice.handsFree
                    ? 'Listening — stop speaking for a moment and your question sends itself.'
                    : 'Listening — press the microphone again to stop, then review before sending.'}
                </span>
              </p>
            ) : isPreparingFiles ? (
              // Explain the disabled send button rather than leaving it inert.
              <p className="mt-1.5 flex items-center gap-1.5 font-sans text-[10px] text-primary">
                <Loader2 size={10} className="shrink-0 animate-spin" />
                <span>
                  Preparing {preparingFileNames.length > 0
                    ? preparingFileNames.join(', ')
                    : 'your file'}
                  {' '}— you can send as soon as it is ready to be searched.
                </span>
              </p>
            ) : null}
          </div>
        </div>


      </div>

      {lightboxResource && (
        <ImageLightbox
          chatId={activeChatId}
          resource={lightboxResource}
          onClose={() => setLightboxResource(null)}
        />
      )}
    </div>
  );
}
