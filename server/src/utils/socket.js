const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const cookie = require("cookie");
const logger = require("./logger");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
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
