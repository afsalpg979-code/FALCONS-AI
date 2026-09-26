import { Router } from "express";
import { listTools, runTool } from "../services/toolService.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (_req, res) => {
  res.json({ tools: listTools() });
});

router.post("/run", requireAuth, async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const input = req.body?.input && typeof req.body.input === "object" ? req.body.input : {};

  try {
    const result = await runTool(name, input);
    res.json({ tool: name, result });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || "Tool execution failed." });
  }
});

export default router;
