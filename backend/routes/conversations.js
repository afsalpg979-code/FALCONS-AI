import { Router } from "express";
import { createConversation, deleteConversation, getConversation, getMessages, listConversations } from "../database/database.js";

const router = Router();

router.get("/", (_req, res) => res.json({ conversations: listConversations() }));

router.post("/", (req, res) => {
  const title = typeof req.body?.title === "string" && req.body.title.trim()
    ? req.body.title.trim().slice(0, 120)
    : "New FALCONS Session";
  res.status(201).json({ conversation: createConversation(title) });
});

router.get("/:id/messages", (req, res) => {
  const id = Number(req.params.id);
  const conversation = getConversation(id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  res.json({ conversation, messages: getMessages(id) });
});

router.delete("/:id", (req, res) => {
  const deleted = deleteConversation(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: "Conversation not found" });
  res.json({ success: true });
});

export default router;
