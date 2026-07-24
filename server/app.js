const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const secureHpp = require("./src/middlewares/secureHpp");
// const { limiter } = require("./src/middlewares/rateLimiter");

const errorHandler = require("./src/middlewares/errorHandler");
const apiRouter = require("./src/routes");

const app = express();

// Security headers first (cross-origin so Vite client on :5173 can call this API)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Body / cookie parsers before sanitizers that inspect req.body / query
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Block HTTP parameter pollution, then sanitize XSS payloads in body/query/params
app.use(secureHpp());
app.use(xss());

// app.use(limiter);

// Route Mount
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is running",
  });
});

app.use("/api", apiRouter);

// Global error handler
app.use(errorHandler);

module.exports = app;
