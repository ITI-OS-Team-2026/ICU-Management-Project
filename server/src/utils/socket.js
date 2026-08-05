const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const cookie = require("cookie");
const logger = require("./logger");

let io;

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

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = getAllowedOrigins();
        const sanitizedOrigin = origin.replace(/\/$/, "");
        if (allowed.includes(sanitizedOrigin) || sanitizedOrigin.endsWith(".vercel.app")) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV !== "production") {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies[config.cookieName];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded; // { id, role, ... }
      
      // Automatically join a room with the user's own ID
      socket.join(decoded.id.toString());
      
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // One line per connect/disconnect, for every clinician, all day — real
    // signal for debugging a specific dropped session, not something worth
    // the default log level in steady state.
    logger.debug(`Socket connected: ${socket.id} (User: ${socket.user.id})`);

    socket.on("disconnect", () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = {
  initSocket,
  getIo,
};
