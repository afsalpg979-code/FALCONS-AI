import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey && apiKey !== "your_api_key_here" ? new OpenAI({ apiKey }) : null;
const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const MIME_TYPES = new Map([
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".txt", "text/plain"],
  [".md", "text/markdown"],
  [".csv", "text/csv"],
  [".json", "application/json"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"]
]);

function safeFilename(name) {
  return String(name || "uploaded-file").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180);
}

function extension(filename) {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function supportedFileTypes() {
  return Array.from(MIME_TYPES.entries()).map(([ext, mime]) => ({ extension: ext, mimeType: mime }));
}

export function validateFile({ originalname, mimetype, size }) {
  const name = safeFilename(originalname);
  const ext = extension(name);
  const expectedMime = MIME_TYPES.get(ext);

  if (!expectedMime) {
    throw new Error("Unsupported file type. Supported: PDF, DOCX, TXT, Markdown, CSV, JSON, PNG, JPG, WEBP, GIF.");
  }

  if (mimetype !== expectedMime) {
    throw new Error("File type does not match its extension.");
  }

  const maxBytes = Math.min(
    20 * 1024 * 1024,
    Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 8) * 1024 * 1024
  );

  if (size > maxBytes) {
    throw new Error("File is too large. Maximum size is " + Math.round(maxBytes / 1024 / 1024) + " MB.");
  }

  return {
    filename: name,
    extension: ext,
    mimeType: expectedMime
  };
}

function assertMagic(buffer, mimeType) {
  if (!buffer?.length) throw new Error("Uploaded file is empty.");

  if (mimeType === "application/pdf" && buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("The uploaded PDF is not a valid PDF file.");
  }

  if (mimeType === "image/png") {
    const signature = "89504e470d0a1a0a";
    if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error("Invalid PNG file.");
  }

  if (mimeType === "image/jpeg" && !(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
    throw new Error("Invalid JPEG file.");
  }

  if (mimeType === "image/gif" && !["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString())) {
    throw new Error("Invalid GIF file.");
  }

  if (mimeType === "image/webp" &&
      (buffer.subarray(0, 4).toString() !== "RIFF" || buffer.subarray(8, 12).toString() !== "WEBP")) {
    throw new Error("Invalid WEBP file.");
  }
}

function textMime(mimeType) {
  return ["text/plain", "text/markdown", "text/csv", "application/json"].includes(mimeType);
}

export function isAIConfigured() {
  return Boolean(client);
}

export async function analyzeUploadedFile({ buffer, originalname, mimetype, question }) {
  if (!client) {
    const error = new Error("OPENAI_API_KEY is not configured. Add it to backend/.env.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const cleanName = safeFilename(originalname);
  const cleanQuestion = String(question || "Analyze this file and provide a clear summary, important details, and useful next steps.").trim().slice(0, 5000);

  assertMagic(buffer, mimetype);

  let content;
  if (textMime(mimetype)) {
    const text = buffer.toString("utf8").slice(0, 200000);
    content = [
      { type: "input_text", text: "File name: " + cleanName },
      { type: "input_text", text: "User request: " + cleanQuestion },
      { type: "input_text", text: "File contents:\n" + text }
    ];
  } else if (mimetype.startsWith("image/")) {
    content = [
      { type: "input_text", text: "File name: " + cleanName + "\nUser request: " + cleanQuestion },
      {
        type: "input_image",
        image_url: "data:" + mimetype + ";base64," + buffer.toString("base64"),
        detail: "auto"
      }
    ];
  } else {
    content = [
      { type: "input_text", text: "File name: " + cleanName + "\nUser request: " + cleanQuestion },
      {
        type: "input_file",
        filename: cleanName,
        file_data: buffer.toString("base64")
      }
    ];
  }

  const response = await client.responses.create({
    model,
    instructions: "You are FALCONS file intelligence. Analyze the supplied file accurately. Clearly separate facts from interpretation. Do not invent details. For documents, identify key points, structure, dates, numbers, and action items when present. For images, describe visible content and answer the user's question. Keep private file contents within this request.",
    input: [{ role: "user", content }]
  });

  return response.output_text || "The file was processed but no text response was produced.";
}
