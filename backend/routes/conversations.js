import { Router } from "express";
import {
  createConversation,
  deleteConversation,
  getConversation,
  getMessages,
  listConversations
} from "../database/database.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  res.json({ conversations: listConversations(req.user.id) });
});

router.post("/", (req, res) => {
  const title = typeof req.body?.title === "string" && req.body.title.trim()
    ? req.body.title.trim().slice(0, 120)
    : "New FALCONS Session";

  res.status(201).json({
    conversation: createConversation(req.user.id, title)
  });
});

router.get("/:id/messages", (req, res) => {
  const id = Number(req.params.id);
  const conversation = getConversation(id, req.user.id);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  res.json({
    conversation,
    messages: getMessages(id, req.user.id)
  });
});

router.delete("/:id", (req, res) => {
  const deleted = deleteConversation(Number(req.params.id), req.user.id);

  if (!deleted) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  res.json({ success: true });
});

export default router;
