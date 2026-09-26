import { Router } from "express";
import {
  addMessage,
  createConversation,
  createMemory,
  deleteMemory,
  getConversation,
  getConversationSummary,
  getMessages,
  listMemories
} from "../database/database.js";
import { requireAuth } from "../middleware/auth.js";
import { generateReply, summarizeConversation } from "../services/aiService.js";
import { runTool } from "../services/toolService.js";

const router = Router();
router.use(requireAuth);

function parseToolCommand(message) {
  const match = message.match(/^\/(weather|search|calc|time|convert|api)\s+([\s\S]+)$/i);
  if (!match) return null;

  const command = match[1].toLowerCase();
  const input = match[2].trim();

  switch (command) {
    case "weather": return { name: "weather", input: { location: input } };
    case "search": return { name: "web_search", input: { query: input } };
    case "calc": return { name: "calculator", input: { expression: input } };
    case "time": return { name: "current_time", input: { timeZone: input } };
    case "convert": {
      const parts = input.split(/\s+/);
      if (parts.length !== 3) throw new Error("Use /convert VALUE FROM TO, e.g. /convert 10 km m");
      return { name: "unit_convert", input: { value: parts[0], from: parts[1], to: parts[2] } };
    }
    case "api": return { name: "api_get", input: { url: input } };
    default: return null;
  }
}

function parseMemoryCommand(message) {
  if (/^\/remember\s+/i.test(message)) {
    return { type: "remember", content: message.replace(/^\/remember\s+/i, "").trim() };
  }
  if (/^\/memories\s*$/i.test(message)) return { type: "list" };
  if (/^\/forget\s+\d+\s*$/i.test(message)) {
    return { type: "forget", id: Number(message.match(/\d+/)[0]) };
  }
  if (/^\/summarize\s*$/i.test(message)) return { type: "summarize" };
  return null;
}

function formatToolReply(name, result) {
  if (name === "calculator") return "Calculator result: " + result.result;
  if (name === "current_time") return result.timeZone + ": " + result.local;
  if (name === "weather") {
    const current = result.current || {};
    const units = result.units || {};
    return [
      "Weather: " + result.location,
      "Temperature: " + current.temperature_2m + " " + (units.temperature_2m || "°C"),
      "Feels like: " + current.apparent_temperature + " " + (units.apparent_temperature || "°C"),
      "Humidity: " + current.relative_humidity_2m + "%",
      "Wind: " + current.wind_speed_10m + " " + (units.wind_speed_10m || "km/h")
    ].join("\n");
  }
  if (name === "web_search") {
    const lines = [result.answer ? "Web answer: " + result.answer : "Web results:"];
    (result.results || []).forEach((item, index) => {
      lines.push((index + 1) + ". " + item.title + " — " + item.url);
    });
    return lines.join("\n");
  }
  if (name === "unit_convert") return result.value + " " + result.from + " = " + result.result + " " + result.to;
  if (name === "api_get") return JSON.stringify(result.data, null, 2);
  return JSON.stringify(result, null, 2);
}

function memoryContext(userId) {
  const memories = listMemories(userId, process.env.MEMORY_LIMIT || 50);
  return memories.map((memory) =>
    "[" + memory.memory_type + " | importance " + memory.importance + "] " + memory.content
  ).join("\n");
}

router.post("/", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Message is required" });
  if (message.length > 20000) return res.status(400).json({ error: "Message is too long" });

  let conversationId = Number(req.body?.conversationId);
  let conversation = Number.isInteger(conversationId) && conversationId > 0
    ? getConversation(conversationId, req.user.id)
    : null;

  if (!conversation) {
    conversation = createConversation(req.user.id, message.slice(0, 60));
    conversationId = conversation.id;
  }

  addMessage(conversationId, "user", message);

  try {
    const memoryCommand = parseMemoryCommand(message);

    if (memoryCommand?.type === "remember") {
      const content = memoryCommand.content;
      if (content.length < 2 || content.length > 1000) throw new Error("Use /remember with 2-1000 characters.");
      const memory = createMemory(req.user.id, { content, memoryType: "fact", importance: 3, source: "chat" });
      const reply = "Saved to long-term memory. Memory ID: " + memory.id;
      const saved = addMessage(conversationId, "assistant", reply);
      return res.json({ conversation: getConversation(conversationId, req.user.id), message: saved, memory });
    }

    if (memoryCommand?.type === "list") {
      const memories = listMemories(req.user.id, 100);
      const reply = memories.length
        ? memories.map((memory) => "#" + memory.id + " [" + memory.memory_type + "] " + memory.content).join("\n")
        : "No long-term memories saved.";
      const saved = addMessage(conversationId, "assistant", reply);
      return res.json({ conversation: getConversation(conversationId, req.user.id), message: saved, memories });
    }

    if (memoryCommand?.type === "forget") {
      const deleted = deleteMemory(memoryCommand.id, req.user.id);
      const reply = deleted
        ? "Memory #" + memoryCommand.id + " deleted."
        : "Memory #" + memoryCommand.id + " was not found.";
      const saved = addMessage(conversationId, "assistant", reply);
      return res.json({ conversation: getConversation(conversationId, req.user.id), message: saved });
    }

    if (memoryCommand?.type === "summarize") {
      const history = getMessages(conversationId, req.user.id);
      if (!history.length) throw new Error("Conversation has no messages to summarize.");
      const summary = await summarizeConversation(history.slice(-80));
      const reply = "Conversation summary saved:\n\n" + summary;
      const saved = addMessage(conversationId, "assistant", reply);
      const { saveConversationSummary } = await import("../database/database.js");
      saveConversationSummary(conversationId, req.user.id, summary);
      return res.json({ conversation: getConversation(conversationId, req.user.id), message: saved, summary });
    }

    const toolCommand = parseToolCommand(message);
    if (toolCommand) {
      const toolResult = await runTool(toolCommand.name, toolCommand.input);
      const reply = formatToolReply(toolCommand.name, toolResult);
      const saved = addMessage(conversationId, "assistant", reply);

      return res.json({
        conversation: getConversation(conversationId, req.user.id),
        message: saved,
        tool: toolCommand.name
      });
    }

    const history = getMessages(conversationId, req.user.id).slice(-30);
    const savedSummary = getConversationSummary(conversationId, req.user.id);
    const reply = await generateReply(history, {
      memoryContext: memoryContext(req.user.id),
      summaryContext: savedSummary?.summary || ""
    });
    const saved = addMessage(conversationId, "assistant", reply);

    res.json({
      conversation: getConversation(conversationId, req.user.id),
      message: saved
    });
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ error: error.message, code: error.code });
    }

    console.error(error);
    return res.status(502).json({
      error: error.message || "The AI or tool service could not complete the request."
    });
  }
});

export default router;
