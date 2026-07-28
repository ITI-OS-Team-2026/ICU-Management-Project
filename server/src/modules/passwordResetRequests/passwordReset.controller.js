const passwordResetService = require("./passwordReset.service");

// POST /password-reset-requests — submit a new request
const createRequest = async (req, res, next) => {
  try {
    const { message } = req.body;
    const result = await passwordResetService.createRequest(req.user.id, message);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// GET /password-reset-requests/my — user gets their own requests
const getMyRequests = async (req, res, next) => {
  try {
    const requests = await passwordResetService.getMyRequests(req.user.id);
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

// POST /password-reset-requests/mark-seen — user marks replies as seen
const markRequestsSeen = async (req, res, next) => {
  try {
    await passwordResetService.markRequestsSeen(req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// GET /password-reset-requests/unseen-count — for sidebar badge
const countUnseenReplies = async (req, res, next) => {
  try {
    const result = await passwordResetService.countUnseenReplies(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// GET /admin/password-reset-requests — admin sees all requests
const getAllRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const requests = await passwordResetService.getAllRequests({ status });
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

// GET /admin/password-reset-requests/pending-count — for admin badge
const countPendingRequests = async (req, res, next) => {
  try {
    const result = await passwordResetService.countPendingRequests();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// POST /admin/password-reset-requests/:id/resolve — admin replies
const resolveRequest = async (req, res, next) => {
  try {
    const { adminReply } = req.body;
    if (!adminReply || !adminReply.trim()) {
      return res.status(400).json({ message: "A reply (new temporary password) is required." });
    }
    const result = await passwordResetService.resolveRequest(
      req.user.id,
      req.params.id,
      adminReply
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  markRequestsSeen,
  countUnseenReplies,
  getAllRequests,
  countPendingRequests,
  resolveRequest,
};
