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
/**
 * @swagger
 * /admissions/{id}/investigation-orders:
 *   post:
 *     summary: Order an investigation (doctors only)
 *     tags: [Investigation Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Order created
 *   get:
 *     summary: List investigation orders for an admission
 *     tags: [Investigation Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order list
 */
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
/**
 * @swagger
 * /investigation-orders/{id}:
 *   patch:
 *     summary: Update an investigation order's status or result (doctors only)
 *     tags: [Investigation Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated order
 */
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
