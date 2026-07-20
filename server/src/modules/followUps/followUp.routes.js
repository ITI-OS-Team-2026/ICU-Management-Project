const express = require("express");
const followUpController = require("./followUp.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const { createFollowUpSchema } = require("./followUp.schema");

const admissionFollowUpRouter = express.Router();
const followUpRouter = express.Router();


// POST /admissions/:id/follow-ups
admissionFollowUpRouter.post(
  "/:id/follow-ups",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  validate({ body: createFollowUpSchema }),
  followUpController.createFollowUp
);

// GET /admissions/:id/follow-ups
admissionFollowUpRouter.get(
  "/:id/follow-ups",
  verifyToken,
  restrictTo(["ICU_NURSE", "MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  followUpController.getFollowUps
);

// DELETE /follow-ups/:id
followUpRouter.delete(
  "/:id",
  verifyToken,
  restrictTo(["MEDICAL_RESIDENT", "ICU_SPECIALIST"]),
  followUpController.deleteFollowUp
);

module.exports = {
  admissionFollowUpRouter,
  followUpRouter,
};
