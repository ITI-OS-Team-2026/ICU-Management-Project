const express = require("express");
const followUpController = require("./followUp.controller");
const validate = require("../../middlewares/validate");
const verifyToken = require("../../middlewares/verifyToken");
const restrictTo = require("../../middlewares/restrictTo");
const { createFollowUpSchema } = require("./followUp.schema");

const admissionFollowUpRouter = express.Router();
const followUpRouter = express.Router();


/**
 * @swagger
 * /admissions/{id}/follow-ups:
 *   post:
 *     summary: Schedule a clinical follow-up (doctors only)
 *     tags: [Follow-Ups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Follow-up scheduled
 *   get:
 *     summary: List follow-ups for an admission
 *     tags: [Follow-Ups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Follow-up list
 */
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

/**
 * @swagger
 * /follow-ups/{id}:
 *   delete:
 *     summary: Delete a scheduled follow-up (doctors only)
 *     tags: [Follow-Ups]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 */
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
