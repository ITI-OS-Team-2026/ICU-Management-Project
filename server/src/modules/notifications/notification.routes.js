const express = require("express");
const controller = require("./notification.controller");
const verifyToken = require("../../middlewares/verifyToken");

const router = express.Router();

router.use(verifyToken);

router.get("/", controller.getNotifications);
router.patch("/:id/read", controller.markAsRead);

module.exports = router;
