import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  claimLegacyConversations,
  countUsers,
  createUser,
  getUserByEmail,
  getUserById,
  updateUserProfile
} from "../database/database.js";
import {
  clearAuthCookie,
  isAuthConfigured,
  requireAuth,
  setAuthCookie,
  signAuthToken
} from "../middleware/auth.js";

const router = Router();

function cleanUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/register", async (req, res) => {
  if (!isAuthConfigured()) {
    return res.status(503).json({
      error: "Authentication is not configured. Add JWT_SECRET to backend/.env.",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
  }
  if (!validEmail(email) || email.length > 160) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Password must be 8 to 128 characters." });
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  try {
    const hadUsers = countUsers() > 0;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUser({ name, email, passwordHash });

    if (!hadUsers) claimLegacyConversations(user.id);

    setAuthCookie(res, signAuthToken(user.id));
    res.status(201).json({ user: cleanUser(getUserById(user.id)) });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "An account with that email already exists." });
    }
    console.error(error);
    res.status(500).json({ error: "Unable to create the account." });
  }
});

router.post("/login", async (req, res) => {
  if (!isAuthConfigured()) {
    return res.status(503).json({
      error: "Authentication is not configured. Add JWT_SECRET to backend/.env.",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const user = getUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({
      error: "Invalid email or password.",
      code: "AUTH_INVALID"
    });
  }

  setAuthCookie(res, signAuthToken(user.id));
  res.json({ user: cleanUser(user) });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: cleanUser(getUserById(req.user.id)) });
});

router.put("/profile", requireAuth, (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const bio = typeof req.body?.bio === "string" ? req.body.bio.trim() : "";

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
  }
  if (bio.length > 400) {
    return res.status(400).json({ error: "Bio must be 400 characters or less." });
  }

  res.json({ user: updateUserProfile(req.user.id, { name, bio }) });
});

export default router;
