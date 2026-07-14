const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

// Restricts route access to specific roles. Must run after verifyToken.
// Logs access denials to the AuditLog table before returning a 403.
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Log the denied access attempt before responding
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: "VIEW",
          targetTable: "route_access",
          targetId: null,
          oldValues: null,
          newValues: {
            attemptedRoute: `${req.method} ${req.originalUrl}`,
            userRole: req.user.role,
            allowedRoles,
            denied: true,
          },
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.get("User-Agent") || null,
        },
      });
    } catch (auditErr) {
      // Never let audit logging failure mask the actual 403 response
      logger.error("Failed to write role-denial audit log", auditErr);
    }

    return res.status(403).json({ message: "Forbidden" });
  };
};

module.exports = requireRole;
