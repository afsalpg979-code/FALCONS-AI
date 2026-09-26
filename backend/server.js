import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import conversationsRouter from "./routes/conversations.js";
import chatRouter from "./routes/chat.js";
import authRouter from "./routes/auth.js";
import toolsRouter from "./routes/tools.js";
import filesRouter from "./routes/files.js";
import memoryRouter from "./routes/memory.js";
import { isAIConfigured } from "./services/aiService.js";
import { isAuthConfigured } from "./middleware/auth.js";

const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const origins = (process.env.CORS_ORIGIN || "http://127.0.0.1:5500,http://localhost:5500")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origins.includes("*") || origins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "FALCONS AI Backend",
    aiConfigured: isAIConfigured(),
    authConfigured: isAuthConfigured(),
    toolsAvailable: true,
    fileProcessingAvailable: true,
    longTermMemoryAvailable: true,
    host,
    port,
    time: new Date().toISOString()
  });
});

app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/files", filesRouter);
app.use("/api/memory", memoryRouter);

app.get("/", (_req, res) => {
  res.json({
    service: "FALCONS AI Backend",
    status: "online",
    health: "/api/health",
    api: "/api"
  });
});

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);

  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Uploaded file is too large." });
  }

  if (error?.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ error: error.message });
  }

  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, host, () => {
  console.log("FALCONS backend listening on http://" + host + ":" + port);
});
