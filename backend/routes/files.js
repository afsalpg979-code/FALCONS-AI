import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import {
  deleteFileAnalysis,
  listFileAnalyses,
  saveFileAnalysis
} from "../database/database.js";
import {
  analyzeUploadedFile,
  supportedFileTypes,
  validateFile
} from "../services/fileService.js";

const router = Router();

const maxUploadBytes = Math.min(
  20 * 1024 * 1024,
  Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 8) * 1024 * 1024
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes, files: 1 }
});

router.use(requireAuth);

router.get("/supported", (_req, res) => {
  res.json({
    maxUploadMB: Math.round(maxUploadBytes / 1024 / 1024),
    types: supportedFileTypes()
  });
});

router.get("/history", (req, res) => {
  res.json({ analyses: listFileAnalyses(req.user.id) });
});

router.post("/analyze", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Attach a file to analyze." });

  try {
    const validated = validateFile(req.file);
    const question = typeof req.body?.question === "string" && req.body.question.trim()
      ? req.body.question.trim()
      : "Analyze this file and provide a clear summary, important details, and useful next steps.";

    const result = await analyzeUploadedFile({
      buffer: req.file.buffer,
      originalname: validated.filename,
      mimetype: validated.mimeType,
      question
    });

    const saved = saveFileAnalysis(req.user.id, {
      filename: validated.filename,
      mimeType: validated.mimeType,
      sizeBytes: req.file.size,
      question,
      result
    });

    res.status(201).json({ analysis: saved });
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ error: error.message, code: error.code });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "File is too large." : error.message });
    }
    res.status(400).json({ error: error.message || "File processing failed." });
  }
});

router.delete("/history/:id", (req, res) => {
  const deleted = deleteFileAnalysis(Number(req.params.id), req.user.id);
  if (!deleted) return res.status(404).json({ error: "File analysis not found." });
  res.json({ success: true });
});

export default router;
