const express = require("express");
const prismaHealthCheckRoutes = require("../modules/prismaHealthCheck/prismaHealthCheck.routes");

const router = express.Router();

router.use("/prisma-health-check", prismaHealthCheckRoutes);

module.exports = router;
