const prismaHealthCheckService = require("../services/prismaHealthCheck.service");

const createHealthCheck = async (req, res, next) => {
  try {
    const data = await prismaHealthCheckService.createHealthCheck(req.body);

    return res.status(201).json({
      status: "success",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getAllHealthChecks = async (req, res, next) => {
  try {
    const data = await prismaHealthCheckService.getAllHealthChecks();

    return res.status(200).json({
      status: "success",
      results: data.length,
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const getHealthCheckById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await prismaHealthCheckService.getHealthCheckById(id);

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const updateHealthCheckById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await prismaHealthCheckService.updateHealthCheckById(
      id,
      req.body,
    );

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

const deleteHealthCheckById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prismaHealthCheckService.deleteHealthCheckById(id);

    return res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createHealthCheck,
  getAllHealthChecks,
  getHealthCheckById,
  updateHealthCheckById,
  deleteHealthCheckById,
};
