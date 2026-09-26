import { Router } from "express";
import { addMessage, createConversation, getConversation, getMessages } from "../database/database.js";
import { generateReply } from "../services/aiService.js";

const router = Router();

router.post("/", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Message is required" });
  if (message.length > 20000) return res.status(400).json({ error: "Message is too long" });

  let conversationId = Number(req.body?.conversationId);
  let conversation = Number.isInteger(conversationId) && conversationId > 0 ? getConversation(conversationId) : null;
  if (!conversation) {
    conversation = createConversation(message.slice(0, 60));
    conversationId = conversation.id;
  }

  addMessage(conversationId, "user", message);
  const history = getMessages(conversationId).slice(-30);

  try {
    const reply = await generateReply(history);
    const saved = addMessage(conversationId, "assistant", reply);
    res.json({ conversation: getConversation(conversationId), message: saved });
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    console.error(error);
    return res.status(502).json({ error: "The AI service could not complete the request." });
  }
});

export default router;
