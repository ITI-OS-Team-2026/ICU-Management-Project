const prisma = require("../utils/prismaClient");

const createOne = (data) => {
  return prisma.prismaHealthCheck.create({
    data,
  });
};

const findAll = () => {
  return prisma.prismaHealthCheck.findMany({
    orderBy: {
      id: "desc",
    },
  });
};

const findById = (id) => {
  return prisma.prismaHealthCheck.findUnique({
    where: { id },
  });
};

const updateById = (id, data) => {
  return prisma.prismaHealthCheck.update({
    where: { id },
    data,
  });
};

const deleteById = (id) => {
  return prisma.prismaHealthCheck.delete({
    where: { id },
  });
};

module.exports = {
  createOne,
  findAll,
  findById,
  updateById,
  deleteById,
};
