const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const adminRoutes = require("../modules/admin/admin.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
