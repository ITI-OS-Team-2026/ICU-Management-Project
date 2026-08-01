import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  StopCircle,
  PanelLeft,
  Plus,
  Paperclip,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { useKnowledgeChats } from '../hooks/useKnowledgeChats';
import CitationList from '../components/rag/CitationList';
import ChatHistorySidebar from '../components/rag/ChatHistorySidebar';
import ChatResourceBar from '../components/rag/ChatResourceBar';
import MessageAttachments from '../components/rag/MessageAttachments';
import ImageLightbox from '../components/rag/ImageLightbox';

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

function ChatBubble({ message, chatId, attachments, onOpenImage }) {
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

  const [question, setQuestion] = useState('');
  // The rail is permanent from `lg` up; below that it is a togglable panel.
  const [showHistory, setShowHistory] = useState(false);
  const [lightboxResource, setLightboxResource] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, isAsking]);

  const submitQuestion = async (text) => {
    const value = String(text ?? question).trim();
    // Hold the question until every attached file is uploaded AND indexed:
    // asking sooner means the assistant cannot read the file it was given.
    if (!value || isAsking || isPreparingFiles) return;

    setQuestion('');
    await ask(value);
    inputRef.current?.focus();
  };

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
          } lg:block lg:col-span-3 h-[calc(100vh-11rem)] min-h-[520px]`}
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
          />
        </div>

        {/* ── Conversation ───────────────────────────────────────────────── */}
        <div className="lg:col-span-9 xl:col-span-6 flex flex-col rounded-xl border border-border bg-card shadow-sm h-[calc(100vh-11rem)] min-h-[520px] overflow-hidden">
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
              <div className="min-w-0">
                <h1 className="font-display text-base font-bold text-foreground leading-tight truncate">
                  {activeChat ? activeChat.title : 'Medical Knowledge Assistant'}
                </h1>
                <p className="font-sans text-[11px] text-muted-foreground truncate">
                  {activeChat
                    ? 'Saved chat — continue where you left off'
                    : 'Ask about medical knowledge from clinical guidelines — references the indexed knowledge base'}
                </p>
              </div>
            </div>

            {(messages.length > 0 || activeChatId) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="h-8 shrink-0 gap-1.5"
              >
                <Plus size={13} />
                <span className="hidden sm:inline">New chat</span>
              </Button>
            )}
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {isLoadingMessages ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-2/3 ml-auto rounded-2xl" />
                <Skeleton className="h-24 w-4/5 rounded-2xl" />
                <Skeleton className="h-12 w-1/2 ml-auto rounded-2xl" />
              </div>
            ) : isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={22} />
                </div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Ask medical knowledge questions
                </h2>
                <p className="mt-1 max-w-sm font-sans text-xs leading-relaxed text-muted-foreground">
                  Questions about medical concepts, guidelines, symptom interpretation, occupational
                  exposures, risk factors, and clinical frameworks from the ICU medicine knowledge
                  base. Every conversation is saved so you can return to it later.
                </p>

                <div className="mt-5 flex w-full max-w-md flex-col gap-2">
                  {KNOWLEDGE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitQuestion(prompt)}
                      disabled={isAsking || isPreparingFiles}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-left font-sans text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
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
                />
              ))
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

            <ChatResourceBar
              chatId={activeChatId}
              resources={stagedResources}
              uploadingFile={uploadingFile}
              onRemove={removeResource}
            />

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFilePicked}
                className="hidden"
                tabIndex={-1}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(uploadingFile)}
                title="Attach a file to this chat"
                aria-label="Attach a file to this chat"
                className="h-[42px] w-[42px] shrink-0"
              >
                {uploadingFile ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
              </Button>

              <Textarea
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                disabled={isAsking}
                placeholder="Ask about medical concepts, guidelines, symptoms, risks, or clinical frameworks…"
                aria-label="Ask the medical assistant a question"
                className="min-h-[42px] max-h-32 resize-y font-sans text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isAsking || isPreparingFiles || !question.trim()}
                title={isPreparingFiles ? 'Waiting for the attached file to finish preparing…' : undefined}
                aria-label="Send question"
                className="h-[42px] w-[42px] shrink-0"
              >
                {isAsking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </form>

            {isPreparingFiles ? (
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
            ) : (
              <p className="mt-1.5 flex items-center gap-1 font-sans text-[10px] text-muted-foreground">
                <Paperclip size={10} className="shrink-0" />
                <span>
                  <strong>+</strong> attaches a PDF, image or text file to this chat (max 10MB) — the
                  assistant reads it once indexing finishes. Enter to send · Shift+Enter for a new line.
                </span>
              </p>
            )}
          </div>
        </div>

        {/* ── Info Panel ─────────────────────────────────────────────────── */}
        <div className="hidden xl:block xl:col-span-3 space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">About This Assistant</h3>
            <ul className="mt-2 space-y-1.5 font-sans text-[11px] leading-relaxed text-muted-foreground list-disc list-inside">
              <li>Searches the indexed medical knowledge base first and cites it when it answers the question</li>
              <li>Falls back to the AI's own general medical knowledge when the knowledge base has nothing relevant — labeled "General AI knowledge"</li>
              <li>NOT patient-specific — no access to individual patient records</li>
              <li>Great for: understanding concepts, checking guidelines, learning best practices</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">Your Chats</h3>
            <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
              Conversations are saved automatically and are private to your account. Reopen one from
              the list on the left to keep going — follow-up questions use that chat's earlier turns
              for context. Rename or delete a chat with the icons on its row.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">Attaching Files</h3>
            <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
              Use <strong>+</strong> to attach a paper, protocol or scan to the chat you are in. It
              is indexed and then searchable <em>only inside that chat</em> — no other chat and no
              other clinician can retrieve it. Deleting the file, or the whole chat, removes it from
              cloud storage and the database.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">Knowledge Base Includes</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">History-Taking Guides</Badge>
              <Badge variant="outline" className="text-[10px]">Symptom Analysis</Badge>
              <Badge variant="outline" className="text-[10px]">Occupational Exposures</Badge>
              <Badge variant="outline" className="text-[10px]">Risk Stratification</Badge>
              <Badge variant="outline" className="text-[10px]">Gender-Specific Care</Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <h3 className="font-display text-xs font-bold text-foreground">Tip</h3>
            <p className="mt-2 font-sans text-[11px] leading-relaxed text-muted-foreground">
              Use this for medical concepts and guidelines. For patient-specific questions, go to a
              patient's record and use the <strong>AI Chat</strong> tab to ask about their records.
            </p>
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
