const express = require("express");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const investigationOrderController = require("./investigationOrder.controller");
const {
  createInvestigationOrderSchema,
  updateInvestigationOrderSchema,
} = require("./investigationOrder.schema");

const admissionInvestigationRouter = express.Router();
const investigationRouter = express.Router();

// Nested under /admissions/:id/investigation-orders
admissionInvestigationRouter.post(
  "/:id/investigation-orders",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createInvestigationOrderSchema }),
  investigationOrderController.createInvestigationOrder,
);

admissionInvestigationRouter.get(
  "/:id/investigation-orders",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  investigationOrderController.getInvestigationOrders,
);

// Top-level /investigation-orders/:id
investigationRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: updateInvestigationOrderSchema }),
  investigationOrderController.updateInvestigationOrder,
);

module.exports = {
  admissionInvestigationRouter,
  investigationRouter,
};
