const adminService = require("./admin.service");

const createUser = async (req, res, next) => {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const result = await adminService.getUsers({ role, status, search, page, limit });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await adminService.updateUser(req, req.params.id, req.body);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await adminService.deleteUser(req, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getUserStats = async (req, res, next) => {
  try {
    const stats = await adminService.getUserStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

const createBed = async (req, res, next) => {
  try {
    const bed = await adminService.createBed(req.body);
    res.status(201).json(bed);
  } catch (error) {
    next(error);
  }
};

const getBeds = async (req, res, next) => {
  try {
    const { status } = req.query;
    const beds = await adminService.getBeds({ status });
    res.status(200).json(beds);
  } catch (error) {
    next(error);
  }
};

const updateBed = async (req, res, next) => {
  try {
    const bed = await adminService.updateBed(req, req.params.id, req.body);
    res.status(200).json(bed);
  } catch (error) {
    next(error);
  }
};



const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await adminService.getAuditLogs(req.query);
    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

const getAuditLogStats = async (req, res, next) => {
  try {
    const stats = await adminService.getAuditLogStats();
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    await adminService.resetUserPassword(req, req.params.id, req.body.newPassword);
    res.status(200).json({ success: true, message: "User password reset successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetUserPassword,
  createBed,
  getBeds,
  updateBed,
  getUserStats,
  getAuditLogs,
  getAuditLogStats
};
