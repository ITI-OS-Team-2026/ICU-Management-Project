const express = require("express");

const validate = require("../../middlewares/validate");
const prismaHealthCheckController = require("./prismaHealthCheck.controller");
const {
  createHealthCheckSchema,
  updateHealthCheckSchema,
  healthCheckIdParamSchema,
} = require("./prismaHealthCheck.schema");

const router = express.Router();

router
  .route("/")
  .get(prismaHealthCheckController.getAllHealthChecks)
  .post(
    validate({ body: createHealthCheckSchema }),
    prismaHealthCheckController.createHealthCheck,
  );

router
  .route("/:id")
  .get(
    validate({ params: healthCheckIdParamSchema }),
    prismaHealthCheckController.getHealthCheckById,
  )
  .patch(
    validate({
      params: healthCheckIdParamSchema,
      body: updateHealthCheckSchema,
    }),
    prismaHealthCheckController.updateHealthCheckById,
  )
  .delete(
    validate({ params: healthCheckIdParamSchema }),
    prismaHealthCheckController.deleteHealthCheckById,
  );

module.exports = router;
