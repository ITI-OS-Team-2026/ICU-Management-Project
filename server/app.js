const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const { xss } = require("express-xss-sanitizer");
const secureHpp = require("./src/middlewares/secureHpp");

const errorHandler = require("./src/middlewares/errorHandler");
const apiRouter = require("./src/routes");
const swaggerSpec = require("./src/config/swagger");

const app = express();

// Mounted before helmet: Swagger UI ships an inline bootstrap <script>, which
// helmet's default CSP (script-src 'self', no 'unsafe-inline') would block.
// Routes registered here never reach helmet's middleware below.
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
