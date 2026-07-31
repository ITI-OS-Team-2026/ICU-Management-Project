const catchAsync = require("../../utils/catchAsync");
const ragService = require("./rag.service");
const indexingService = require("./indexing.service");
const chatService = require("./chat.service");

// ─── Conversational retrieval (FR-3.1) ───────────────────────────────────────

const createQuery = catchAsync(async (req, res) => {
  const result = await ragService.answerQuestion(req.user.id, req.body, req);

  res.status(200).json({
    status: "success",
    data: result,
  });
});

const getHistory = catchAsync(async (req, res) => {
  const history = await ragService.getHistory(req.params.admissionId, req.query.limit);

  res.status(200).json({
    status: "success",
    results: history.length,
    data: history,
  });
});

const clearHistory = catchAsync(async (req, res) => {
  const result = await ragService.clearHistory(req.params.admissionId, req);

  res.status(200).json(result);
});

// ─── Assistant chats (knowledge mode) ────────────────────────────────────────

const listChats = catchAsync(async (req, res) => {
  const chats = await chatService.listSessions(req.user.id, req.query.limit);

  res.status(200).json({
    status: "success",
    results: chats.length,
    data: chats,
  });
});

const createChat = catchAsync(async (req, res) => {
  const chat = await chatService.createSession(req.user.id, req.body);

  res.status(201).json({
    status: "success",
    data: chat,
  });
});

const getChat = catchAsync(async (req, res) => {
  const chat = await chatService.getSession(req.user.id, req.params.chatId);

  res.status(200).json({
    status: "success",
    data: chat,
  });
});

const renameChat = catchAsync(async (req, res) => {
  const chat = await chatService.renameSession(req.user.id, req.params.chatId, req.body.title);

  res.status(200).json({
    status: "success",
    data: chat,
  });
});

const deleteChat = catchAsync(async (req, res) => {
  const result = await chatService.deleteSession(req.user.id, req.params.chatId, req);

  res.status(200).json(result);
});

const deleteAllChats = catchAsync(async (req, res) => {
  const result = await chatService.deleteAllSessions(req.user.id, req);

  res.status(200).json(result);
});

// ─── Document indexing ───────────────────────────────────────────────────────

const getAdmissionIndexStatus = catchAsync(async (req, res) => {
  const status = await indexingService.getAdmissionIndexStatus(req.params.admissionId);

  res.status(200).json({
    status: "success",
    data: status,
  });
});

const reindexAdmission = catchAsync(async (req, res) => {
  const result = await indexingService.reindexAdmission(req.params.admissionId);

  res.status(202).json({
    status: "success",
    message: `Queued ${result.queued} document${result.queued === 1 ? "" : "s"} for indexing.`,
    data: result,
  });
});

const getDocumentStatus = catchAsync(async (req, res) => {
  const status = await indexingService.getDocumentStatus(req.params.documentId);

  res.status(200).json({
    status: "success",
    data: status,
  });
});

const reindexDocument = catchAsync(async (req, res) => {
  const result = await indexingService.reindexDocument(req.params.documentId);

  res.status(200).json({
    status: "success",
    message: result.message,
    data: result,
  });
});

const getDocumentChunks = catchAsync(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const result = await indexingService.getDocumentChunks(req.params.documentId, limit);

  res.status(200).json({
    status: "success",
    results: result.results,
    data: result,
  });
});

module.exports = {
  createQuery,
  getHistory,
  clearHistory,
  listChats,
  createChat,
  getChat,
  renameChat,
  deleteChat,
  deleteAllChats,
  getAdmissionIndexStatus,
  reindexAdmission,
  getDocumentStatus,
  reindexDocument,
  getDocumentChunks,
};
