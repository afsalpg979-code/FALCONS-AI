import "dotenv/config";
import express from "express";
import cors from "cors";
import conversationsRouter from "./routes/conversations.js";
import chatRouter from "./routes/chat.js";
import { isAIConfigured } from "./services/aiService.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const origins = (process.env.CORS_ORIGIN || "*").split(",").map((item) => item.trim());

app.use(cors({ origin: origins.includes("*") ? true : origins }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "FALCONS AI Backend",
    aiConfigured: isAIConfigured(),
    time: new Date().toISOString()
  });
});

app.use("/api/conversations", conversationsRouter);
app.use("/api/chat", chatRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => console.log(`FALCONS backend listening on http://localhost:${port}`));
