import jwt from "jsonwebtoken";
import { getUserById } from "../database/database.js";

export function isAuthConfigured() {
  return Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET !== "change_this_secret");
}

export function signAuthToken(userId) {
  if (!isAuthConfigured()) {
    const error = new Error("JWT_SECRET is not configured.");
    error.code = "AUTH_NOT_CONFIGURED";
    throw error;
  }
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function setAuthCookie(res, token) {
  res.cookie("falcons_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

export function clearAuthCookie(res) {
  res.clearCookie("falcons_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function requireAuth(req, res, next) {
  if (!isAuthConfigured()) {
    return res.status(503).json({
      error: "Authentication is not configured.",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  const token = req.cookies?.falcons_token;
  if (!token) {
    return res.status(401).json({
      error: "Authentication required.",
      code: "AUTH_REQUIRED"
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = Number(payload.sub);
    const user = getUserById(userId);

    if (!user) {
      return res.status(401).json({
        error: "User account no longer exists.",
        code: "AUTH_INVALID"
      });
    }

    req.user = user;
    next();
  } catch (_error) {
    return res.status(401).json({
      error: "Authentication session is invalid or expired.",
      code: "AUTH_INVALID"
    });
  }
}
