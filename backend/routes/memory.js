import { Router } from "express";
import {
  createMemory,
  deleteMemory,
  getConversation,
  getConversationSummary,
  getMessages,
  listMemories,
  saveConversationSummary,
  searchMemories
} from "../database/database.js";
import { requireAuth } from "../middleware/auth.js";
import { summarizeConversation } from "../services/aiService.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  res.json({
    memories: listMemories(req.user.id, process.env.MEMORY_LIMIT || 50)
  });
});

router.get("/search", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ error: "Search text is required." });
  res.json({ memories: searchMemories(req.user.id, q) });
});

router.post("/", (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  const memoryType = typeof req.body?.memoryType === "string" ? req.body.memoryType.trim().slice(0, 30) : "fact";
  const importance = Number(req.body?.importance || 3);

  if (content.length < 2 || content.length > 1000) {
    return res.status(400).json({ error: "Memory must be between 2 and 1000 characters." });
  }

  try {
    const memory = createMemory(req.user.id, {
      memoryType: memoryType || "fact",
      content,
      importance,
      source: "user"
    });
    res.status(201).json({ memory });
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to save memory." });
  }
});

router.delete("/:id", (req, res) => {
  const deleted = deleteMemory(Number(req.params.id), req.user.id);
  if (!deleted) return res.status(404).json({ error: "Memory not found." });
  res.json({ success: true });
});

router.get("/conversation/:conversationId/summary", (req, res) => {
  const conversationId = Number(req.params.conversationId);
  const conversation = getConversation(conversationId, req.user.id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });

  res.json({
    summary: getConversationSummary(conversationId, req.user.id)
  });
});

router.post("/conversation/:conversationId/summary", async (req, res) => {
  const conversationId = Number(req.params.conversationId);
  const conversation = getConversation(conversationId, req.user.id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });

  try {
    const messages = getMessages(conversationId, req.user.id);
    if (!messages.length) return res.status(400).json({ error: "Conversation has no messages." });

    const summary = await summarizeConversation(messages.slice(-80));
    const saved = saveConversationSummary(conversationId, req.user.id, summary);
    res.status(201).json({ summary: saved });
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    res.status(502).json({ error: error.message || "Unable to summarize conversation." });
  }
});

export default router;
