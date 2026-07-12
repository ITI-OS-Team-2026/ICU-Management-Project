const express = require("express");
// const cors = require("cors");
// const helmet = require("helmet");
// var hpp = require("hpp");
// const { xss } = require("express-xss-sanitizer");
// const { limiter } = require("./middlewares/rateLimiter");

const errorHandler = require("./middlewares/errorHandler");
const prismaHealthCheckRoutes = require("./routes/prismaHealthCheck.routes");

// Routes

const app = express();

app.use(express.json());
// app.use(cors());
// app.use(helmet());
// app.use(hpp());
// app.use(xss());
// app.use(limiter);

// Route Mount
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running",
  });
});

app.use("/api/prisma-health-check", prismaHealthCheckRoutes);

// Global error handler
app.use(errorHandler);

module.exports = app;
