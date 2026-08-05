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

// POST /admissions/:id/treatment-approvals
admissionTreatmentApprovalRouter.post(
  "/:id/treatment-approvals",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createTreatmentApprovalSchema }),
  treatmentApprovalController.createTreatmentApproval
);

// GET /admissions/:id/treatment-approvals
admissionTreatmentApprovalRouter.get(
  "/:id/treatment-approvals",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  treatmentApprovalController.getTreatmentApprovals
);

// PATCH /treatment-approvals/:id
treatmentApprovalRouter.patch(
  "/:id",
  verifyToken,
  restrictTo(["ICU_SPECIALIST"]),
  validate({ body: decideTreatmentApprovalSchema }),
  treatmentApprovalController.decideTreatmentApproval
);

// PATCH /treatment-approvals/:id/execution — nurse records bedside execution
treatmentApprovalRouter.patch(
  "/:id/execution",
  verifyToken,
  restrictTo(["ICU_NURSE"]),
  validate({ body: executeTreatmentApprovalSchema }),
  treatmentApprovalController.executeTreatmentApproval
);

// DELETE /treatment-approvals/:id — requester withdraws a still-pending request
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
