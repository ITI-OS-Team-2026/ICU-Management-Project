const express = require("express");
const treatmentApprovalController = require("./treatmentApproval.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const {
  createTreatmentApprovalSchema,
  decideTreatmentApprovalSchema,
  executeTreatmentApprovalSchema,
} = require("./treatmentApproval.schema");

const admissionTreatmentApprovalRouter = express.Router();
const treatmentApprovalRouter = express.Router();

/**
 * @swagger
 * /admissions/{id}/treatment-approvals:
 *   post:
 *     summary: Request a treatment approval (doctors only)
 *     tags: [Treatment Approvals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Approval requested
 *   get:
 *     summary: List treatment approvals for an admission
 *     tags: [Treatment Approvals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Approval list
 */
admissionTreatmentApprovalRouter.post(
  "/:id/treatment-approvals",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createTreatmentApprovalSchema }),
  treatmentApprovalController.createTreatmentApproval
);

admissionTreatmentApprovalRouter.get(
  "/:id/treatment-approvals",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  treatmentApprovalController.getTreatmentApprovals
);

/**
 * @swagger
 * /treatment-approvals/{id}:
 *   patch:
 *     summary: Approve or reject a treatment request (specialist only)
 *     tags: [Treatment Approvals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [APPROVED, REJECTED] }
 *     responses:
 *       200:
 *         description: Decision recorded
 *   delete:
 *     summary: Withdraw a still-pending approval request
 *     tags: [Treatment Approvals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Withdrawn
 * /treatment-approvals/{id}/execution:
 *   patch:
 *     summary: Record bedside execution of an approved treatment (nurse only)
 *     tags: [Treatment Approvals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Execution recorded
 */
treatmentApprovalRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  validate({ body: decideTreatmentApprovalSchema }),
  treatmentApprovalController.decideTreatmentApproval
);

treatmentApprovalRouter.patch(
  "/:id/execution",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  validate({ body: executeTreatmentApprovalSchema }),
  treatmentApprovalController.executeTreatmentApproval
);

treatmentApprovalRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  treatmentApprovalController.deleteTreatmentApproval
);

module.exports = {
  admissionTreatmentApprovalRouter,
  treatmentApprovalRouter,
};
