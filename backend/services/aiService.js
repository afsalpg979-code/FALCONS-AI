import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey && apiKey !== "your_api_key_here" ? new OpenAI({ apiKey }) : null;

export function isAIConfigured() {
  return Boolean(client);
}

export async function generateReply(messages) {
  if (!client) {
    const error = new Error("OPENAI_API_KEY is not configured. Add it to backend/.env.");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    instructions: "You are FALCONS, a helpful futuristic AI assistant. Be clear, practical, and honest. Do not claim to have performed actions or accessed data you do not actually have.",
    input: messages.map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }))
  });

  return response.output_text || "I received your request but could not produce a text response.";
}
