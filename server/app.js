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

// Required behind reverse proxies like Railway and Render for correct client IP detection (rate limiting, auditing)
app.set("trust proxy", 1);

// Helper to determine allowed origins dynamically based on environment configuration
const getAllowedOrigins = () => {
  const configured = [process.env.CLIENT_URL, process.env.CLIENT_ORIGIN]
    .filter(Boolean)
    .flatMap((url) => url.split(","))
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const defaults = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];

  return Array.from(new Set([...configured, ...defaults]));
};

// Mounted before helmet: Swagger UI ships an inline bootstrap <script>, which
// helmet's default CSP (script-src 'self', no 'unsafe-inline') would block.
// Routes registered here never reach helmet's middleware below.
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Security headers first
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, Postman)
      if (!origin) return callback(null, true);

      const allowed = getAllowedOrigins();
      const sanitizedOrigin = origin.replace(/\/$/, "");

      if (allowed.includes(sanitizedOrigin) || sanitizedOrigin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy error: Origin ${origin} is not allowed.`));
    },
    credentials: true,
  })
);

// Body / cookie parsers before sanitizers that inspect req.body / query
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Block HTTP parameter pollution, then sanitize XSS payloads in body/query/params
app.use(secureHpp());
app.use(xss());

// Health check endpoints for deployment probes (Railway / Render / Docker / AWS)
app.get(["/health", "/api/health"], (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Route Mount
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "SmartCare ICU API is running",
    health: "/health",
    docs: "/api-docs",
  });
});

app.use("/api", apiRouter);

// Global error handler
app.use(errorHandler);

module.exports = app;
