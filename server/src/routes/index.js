const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const prismaHealthCheckRoutes = require("../modules/prismaHealthCheck/prismaHealthCheck.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/prisma-health-check", prismaHealthCheckRoutes);

module.exports = router;
