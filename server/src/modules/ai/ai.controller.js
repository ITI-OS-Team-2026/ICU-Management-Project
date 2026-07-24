const aiService = require("./ai.service");

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
    const summaries = await aiService.getSummaries(req.params.id);

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

module.exports = {
  createSummary,
  getSummaries,
  createQuery,
  getQueryLogs,
};
