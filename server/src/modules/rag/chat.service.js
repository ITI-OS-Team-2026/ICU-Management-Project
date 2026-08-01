const prisma = require("../../utils/prismaClient");
const APIError = require("../../utils/APIError");
const { auditedTransaction } = require("../../middlewares/auditLog");
const { purgeResourcesForSessions, formatResource } = require("./chatResources.service");

/**
 * Named, resumable conversations with the Medical Knowledge Assistant
 * (ai_chat_sessions / ai_chat_messages).
 *
 * Ownership is absolute: a session belongs to the clinician who started it, and
 * every read/write here is scoped by userId. Another clinician's chat is not
 * merely forbidden — it does not exist (404), so ids cannot be probed.
 *
 * Separate from ai_query_logs on purpose: that table is the admission-scoped
 * clinical record of patient-mode questions and is not user-deletable, whereas
 * these chats are personal scratch space the clinician can rename and delete.
 */

const TITLE_MAX = 120;
/** Titles are derived from the first question; keep them sidebar-sized. */
const DERIVED_TITLE_MAX = 60;
const DEFAULT_TITLE = "New chat";

/** "What are the key elements of…" → a short, sidebar-friendly label. */
const deriveTitle = (question) => {
  const text = String(question || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return DEFAULT_TITLE;
  if (text.length <= DERIVED_TITLE_MAX) return text;

  // Cut on a word boundary so the label does not end mid-word.
  const clipped = text.slice(0, DERIVED_TITLE_MAX);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 24 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
};

const formatMessage = (row) => ({
  id: row.id,
  role: row.role.toLowerCase(),
  content: row.content,
  cited_sources: row.citedSources || [],
  retrieval: row.retrieval || null,
  created_at: row.createdAt,
  ...(row.attachments ? { attachments: row.attachments.map(formatResource) } : {}),
});

const formatSession = (row) => ({
  id: row.id,
  title: row.title,
  mode: row.mode.toLowerCase(),
  created_at: row.createdAt,
  updated_at: row.updatedAt,
  last_message_at: row.lastMessageAt,
  ...(typeof row._count?.messages === "number" ? { message_count: row._count.messages } : {}),
  ...(row.messages ? { messages: row.messages.map(formatMessage) } : {}),
});

/**
 * Load a session the caller owns, or throw 404. Never leaks the existence of
 * another user's chat.
 */
const assertOwnedSession = async (userId, sessionId) => {
  const session = await prisma.aiChatSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) throw new APIError("Chat not found", 404);

  return session;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** The caller's chats, most recently active first — what the sidebar renders. */
const listSessions = async (userId, limit = 100) => {
  const take = Math.max(1, Math.min(Number(limit) || 100, 200));

  const rows = await prisma.aiChatSession.findMany({
    where: { userId },
    // Chats that never received a message sort by creation instead of last.
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take,
    include: { _count: { select: { messages: true } } },
  });

  return rows.map(formatSession);
};

/** One chat with its full transcript, oldest message first. */
const getSession = async (userId, sessionId) => {
  await assertOwnedSession(userId, sessionId);

  const session = await prisma.aiChatSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { attachments: true } },
      _count: { select: { messages: true } },
    },
  });

  return formatSession(session);
};

/**
 * Create an empty chat. The UI does not need this to start talking — asking a
 * question with no chat_id creates one implicitly — but an explicit "New chat"
 * that survives a reload before the first question is sent goes through here.
 */
const createSession = async (userId, { title, mode = "KNOWLEDGE" } = {}) => {
  const session = await prisma.aiChatSession.create({
    data: {
      userId,
      title: String(title || DEFAULT_TITLE).slice(0, TITLE_MAX),
      mode,
    },
    include: { _count: { select: { messages: true } } },
  });

  return formatSession(session);
};

const renameSession = async (userId, sessionId, title) => {
  await assertOwnedSession(userId, sessionId);

  const session = await prisma.aiChatSession.update({
    where: { id: sessionId },
    data: { title: String(title).trim().slice(0, TITLE_MAX) },
    include: { _count: { select: { messages: true } } },
  });

  return formatSession(session);
};

/**
 * Permanently delete one chat, its messages and its attached resources (FK
 * cascade). Audited, because this is the one operation here that destroys
 * stored content.
 *
 * Cloudinary originals are destroyed first: the DB rows go either way, so
 * doing it before the cascade is the only chance to reach them.
 */
const deleteSession = async (userId, sessionId, req) => {
  const session = await assertOwnedSession(userId, sessionId);
  const purged = await purgeResourcesForSessions([sessionId]);

  return await auditedTransaction(
    req,
    { action: "ARCHIVE", targetTable: "AiChatSession" },
    async (tx) => {
      const { count } = await tx.aiChatMessage.deleteMany({ where: { sessionId } });
      await tx.aiChatSession.delete({ where: { id: sessionId } });

      return {
        targetId: sessionId,
        oldValues: {
          id: sessionId,
          title: session.title,
          messages_deleted: count,
          resources_deleted: purged.resources,
        },
        result: {
          status: "success",
          message: "Chat deleted.",
          deleted: 1,
          messages_deleted: count,
          resources_deleted: purged.resources,
        },
      };
    }
  );
};

/** Delete every chat the caller owns ("clear all chats"), resources included. */
const deleteAllSessions = async (userId, req) => {
  const ids = (
    await prisma.aiChatSession.findMany({ where: { userId }, select: { id: true } })
  ).map((row) => row.id);

  const purged = await purgeResourcesForSessions(ids);

  return await auditedTransaction(
    req,
    { action: "ARCHIVE", targetTable: "AiChatSession" },
    async (tx) => {
      if (ids.length > 0) {
        await tx.aiChatMessage.deleteMany({ where: { sessionId: { in: ids } } });
        await tx.aiChatSession.deleteMany({ where: { id: { in: ids } } });
      }

      return {
        targetId: userId,
        oldValues: {
          user_id: userId,
          deleted_sessions: ids.length,
          deleted_resources: purged.resources,
        },
        result: {
          status: "success",
          message: `Deleted ${ids.length} chat${ids.length === 1 ? "" : "s"}.`,
          deleted: ids.length,
          resources_deleted: purged.resources,
        },
      };
    }
  );
};

/**
 * Resolve the session a question belongs to, creating one titled from the
 * question when the client is starting a fresh chat (chat_id omitted).
 * Returns null when sessions do not apply (patient mode).
 */
const resolveSessionForQuestion = async (userId, sessionId, question, mode = "KNOWLEDGE") => {
  if (sessionId) return await assertOwnedSession(userId, sessionId);
  if (!userId) return null;

  return await prisma.aiChatSession.create({
    data: { userId, title: deriveTitle(question), mode },
  });
};

/**
 * Prior turns of this chat, newest first — the shape rag.service expects for
 * the "earlier questions" prompt block, so follow-ups like "and in children?"
 * resolve against what was already asked.
 */
const getRecentTurns = async (sessionId, limit = 5) => {
  if (!sessionId) return [];

  const rows = await prisma.aiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: Math.max(2, limit * 2),
    select: { role: true, content: true, createdAt: true },
  });

  // Rebuild question/answer pairs from the flat message list (oldest first,
  // then reversed back to newest-first to match buildConversationBlock).
  const ordered = rows.slice().reverse();
  const turns = [];

  for (let i = 0; i < ordered.length; i += 1) {
    if (ordered[i].role !== "USER") continue;
    const answer = ordered[i + 1];
    if (answer && answer.role === "ASSISTANT") {
      turns.push({ question: ordered[i].content, aiResponse: answer.content });
    }
  }

  return turns.slice(-limit).reverse();
};

/**
 * Persist one completed exchange and bump the chat's activity timestamp.
 * A chat still carrying the placeholder title adopts the first question.
 */
const appendTurn = async (session, { question, answer, citedSources, retrieval }) => {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const userMessage = await tx.aiChatMessage.create({
      data: { sessionId: session.id, role: "USER", content: question, createdAt: now },
    });

    // Files staged in the composer belong to the message that finally sent
    // them, which is what lets the transcript render each upload in place.
    await tx.medicalDocument.updateMany({
      where: { chatSessionId: session.id, messageId: null, isArchived: false },
      data: { messageId: userMessage.id },
    });

    const assistantMessage = await tx.aiChatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: answer,
        citedSources: citedSources && citedSources.length > 0 ? citedSources : null,
        retrieval: retrieval || null,
        // 1ms apart so ordering by created_at is stable for the pair.
        createdAt: new Date(now.getTime() + 1),
      },
    });

    await tx.aiChatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: now,
        ...(session.title === DEFAULT_TITLE ? { title: deriveTitle(question) } : {}),
      },
    });

    return { userMessage, assistantMessage };
  });
};

module.exports = {
  listSessions,
  getSession,
  createSession,
  renameSession,
  deleteSession,
  deleteAllSessions,
  resolveSessionForQuestion,
  getRecentTurns,
  appendTurn,
  deriveTitle,
  formatSession,
  formatMessage,
  DEFAULT_TITLE,
};
