const authService = require("./auth.service");
const config = require("../../config/env");

// POST /auth/login - Authenticate user, set cookie, and return user profile
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || null;

    const { token, user } = await authService.login({
      email,
      password,
      ipAddress,
      userAgent,
      req,
    });

    // Set JWT in HttpOnly cookie — never in the response body
    res.cookie(config.cookieName, token, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "Strict",
      maxAge: config.cookieMaxAge,
    });

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

// POST /auth/logout - Clear auth cookie and log logout event
const logout = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || null;

    await authService.logout({
      userId: req.user.id,
      ipAddress,
      userAgent,
    });

    // Clear the auth cookie
    res.clearCookie(config.cookieName, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "Strict",
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

// GET /auth/me - Retrieve current authenticated user profile
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  logout,
  getMe,
};
