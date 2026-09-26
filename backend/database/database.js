import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.DATABASE_PATH || "./data/falcons.db";
const resolvedPath = path.resolve(databasePath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'New FALCONS Session',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id);
`);

export function createConversation(title = "New FALCONS Session") {
  const result = db.prepare("INSERT INTO conversations (title) VALUES (?)").run(title);
  return getConversation(result.lastInsertRowid);
}

export function getConversation(id) {
  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id);
}

export function listConversations() {
  return db.prepare("SELECT * FROM conversations ORDER BY updated_at DESC, id DESC").all();
}

export function addMessage(conversationId, role, content) {
  const result = db.prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)").run(conversationId, role, content);
  db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);
}

export function getMessages(conversationId) {
  return db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC").all(conversationId);
}

export function deleteConversation(id) {
  const result = db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return result.changes > 0;
}
