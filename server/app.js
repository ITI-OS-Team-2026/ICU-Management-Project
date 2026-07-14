const express = require("express");
const cookieParser = require("cookie-parser");
// const cors = require("cors");
// const helmet = require("helmet");
// var hpp = require("hpp");
// const { xss } = require("express-xss-sanitizer");
// const { limiter } = require("./src/middlewares/rateLimiter");

const errorHandler = require("./src/middlewares/errorHandler");
const apiRouter = require("./src/routes");

// Routes

const app = express();

app.use(express.json());
app.use(cookieParser());
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

app.use("/api", apiRouter);

// Global error handler
app.use(errorHandler);

module.exports = app;
