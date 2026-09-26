import { Router } from "express";
import {
  addMessage,
  createConversation,
  getConversation,
  getMessages
} from "../database/database.js";
import { requireAuth } from "../middleware/auth.js";
import { generateReply } from "../services/aiService.js";
import { runTool } from "../services/toolService.js";

const router = Router();

router.use(requireAuth);

function parseToolCommand(message) {
  const match = message.match(/^\/(weather|search|calc|time|convert|api)\s+([\s\S]+)$/i);
  if (!match) return null;

  const command = match[1].toLowerCase();
  const input = match[2].trim();

  switch (command) {
    case "weather":
      return { name: "weather", input: { location: input } };
    case "search":
      return { name: "web_search", input: { query: input } };
    case "calc":
      return { name: "calculator", input: { expression: input } };
    case "time":
      return { name: "current_time", input: { timeZone: input } };
    case "convert": {
      const parts = input.split(/\s+/);
      if (parts.length !== 3) throw new Error("Use /convert VALUE FROM TO, e.g. /convert 10 km m");
      return {
        name: "unit_convert",
        input: { value: parts[0], from: parts[1], to: parts[2] }
      };
    }
    case "api":
      return { name: "api_get", input: { url: input } };
    default:
      return null;
  }
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
    const reply = await generateReply(history);
    const saved = addMessage(conversationId, "assistant", reply);

    res.json({
      conversation: getConversation(conversationId, req.user.id),
      message: saved
    });
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({
        error: error.message,
        code: error.code
      });
    }

    console.error(error);
    return res.status(502).json({
      error: error.message || "The AI or tool service could not complete the request."
    });
  }
});

export default router;
