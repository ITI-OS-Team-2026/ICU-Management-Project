const { Prisma } = require("@prisma/client");

const APIError = require("../utils/APIError");
const throwIfNotFound = require("../utils/throwIfNotFound");
const prismaHealthCheckModel = require("../models/prismaHealthCheck.model");

const createHealthCheck = async (payload) => {
  try {
    return await prismaHealthCheckModel.createOne(payload);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new APIError("Health check name already exists", 409);
    }

    throw error;
  }
};

const getAllHealthChecks = () => {
  return prismaHealthCheckModel.findAll();
};

const getHealthCheckById = async (id) => {
  const item = await prismaHealthCheckModel.findById(id);
  return throwIfNotFound(item, "Health check record not found");
};

const updateHealthCheckById = async (id, payload) => {
  try {
    return await prismaHealthCheckModel.updateById(id, payload);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new APIError("Health check record not found", 404);
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new APIError("Health check name already exists", 409);
    }

    throw error;
  }
};

const deleteHealthCheckById = async (id) => {
  try {
    return await prismaHealthCheckModel.deleteById(id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new APIError("Health check record not found", 404);
    }

    throw error;
  }
};

module.exports = {
  createHealthCheck,
  getAllHealthChecks,
  getHealthCheckById,
  updateHealthCheckById,
  deleteHealthCheckById,
};
