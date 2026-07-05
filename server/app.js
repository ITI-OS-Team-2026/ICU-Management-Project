const express = require("express");
// const cors = require("cors");
// const helmet = require("helmet");
// var hpp = require("hpp");
// const { xss } = require("express-xss-sanitizer");
// const { limiter } = require("./middlewares/rateLimiter");


const errorHandler = require("./middlewares/errorHandler");

// Routes

const app = express();

app.use(express.json());
// app.use(cors());
// app.use(helmet());
// app.use(hpp());
// app.use(xss());
// app.use(limiter);

// Route Mount

// Global error handler
app.use(errorHandler);

module.exports = app;
