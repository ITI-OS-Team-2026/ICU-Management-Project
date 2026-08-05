const express = require("express");
const controller = require("./notification.controller");
const verifyToken = require("../../middlewares/verifyToken");

const router = express.Router();

router.use(verifyToken);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: List the current user's notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification list
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Updated notification
 */
router.get("/", controller.getNotifications);
router.patch("/:id/read", controller.markAsRead);

module.exports = router;
