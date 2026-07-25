const aiService = require("./ai.service");
const patientSummaryService = require("./patientSummary.service");

const createSummary = async (req, res, next) => {
  try {
    const summary = await aiService.createSummary(req.user.id, req.body, req);

    res.status(201).json({
      status: "success",
      data: {
        id: summary.id,
        overall_summary: summary.overall_summary,
        generated_at: summary.generated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getSummaries = async (req, res, next) => {
  try {
    const summaries = await aiService.getSummaries(req.params.id, req.query);

    res.status(200).json({
      status: "success",
      results: summaries.length,
      data: summaries,
    });
  } catch (error) {
    next(error);
  }
};

const createQuery = async (req, res, next) => {
  try {
    const result = await aiService.createQuery(req.user.id, req.body, req);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getQueryLogs = async (req, res, next) => {
  try {
    const limit = req.query.limit;
    const logs = await aiService.getQueryLogs(req.params.id, limit);

    res.status(200).json({
      status: "success",
      results: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

const generatePatientSummary = async (req, res, next) => {
  try {
    const summary = await patientSummaryService.generatePatientSummary(
      req.user.id,
      req.params.admissionId,
      req
    );

    res.status(201).json({
      status: "success",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

const getPatientContext = async (req, res, next) => {
  try {
    const context = await patientSummaryService.getPatientContext(
      req.params.admissionId
    );

    res.status(200).json({
      status: "success",
      data: context,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSummary = async (req, res, next) => {
  try {
    const result = await aiService.deleteSummary(req.params.summaryId, req);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const restoreSummary = async (req, res, next) => {
  try {
    const result = await aiService.restoreSummary(req.params.summaryId, req);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSummary,
  getSummaries,
  createQuery,
  getQueryLogs,
  generatePatientSummary,
  getPatientContext,
  deleteSummary,
  restoreSummary,
};
