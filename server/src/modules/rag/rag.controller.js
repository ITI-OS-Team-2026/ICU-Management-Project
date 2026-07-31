const catchAsync = require("../../utils/catchAsync");
const ragService = require("./rag.service");
const indexingService = require("./indexing.service");

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
  const result = await indexingService.getDocumentChunks(
    req.params.documentId,
    req.query.limit
  );

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
  getAdmissionIndexStatus,
  reindexAdmission,
  getDocumentStatus,
  reindexDocument,
  getDocumentChunks,
};
