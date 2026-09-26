import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.DATABASE_PATH || "./data/falcons.db";
const resolvedPath = path.resolve(databasePath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

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

  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    memory_type TEXT NOT NULL DEFAULT 'fact',
    content TEXT NOT NULL,
    importance INTEGER NOT NULL DEFAULT 3 CHECK(importance BETWEEN 1 AND 5),
    source TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, content),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversation_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS file_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    question TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

try {
  db.prepare("ALTER TABLE conversations ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE").run();
} catch (error) {
  if (!String(error.message).includes("duplicate column name")) throw error;
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id);
  CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, importance DESC, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_file_analyses_user ON file_analyses(user_id, created_at DESC);
`);

export function createUser({ name, email, passwordHash, bio = "" }) {
  const result = db.prepare(
    "INSERT INTO users (name, email, password_hash, bio) VALUES (?, ?, ?, ?)"
  ).run(name, email, passwordHash, bio);
  return getUserById(result.lastInsertRowid);
}

export function countUsers() {
  return db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  return db.prepare(
    "SELECT id, name, email, bio, created_at, updated_at FROM users WHERE id = ?"
  ).get(id);
}

export function updateUserProfile(id, { name, bio }) {
  db.prepare(
    "UPDATE users SET name = ?, bio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(name, bio, id);
  return getUserById(id);
}

export function claimLegacyConversations(userId) {
  return db.prepare(
    "UPDATE conversations SET user_id = ? WHERE user_id IS NULL"
  ).run(userId).changes;
}

export function createConversation(userId, title = "New FALCONS Session") {
  const result = db.prepare(
    "INSERT INTO conversations (user_id, title) VALUES (?, ?)"
  ).run(userId, title);
  return getConversation(result.lastInsertRowid, userId);
}

export function getConversation(id, userId) {
  return db.prepare(
    "SELECT * FROM conversations WHERE id = ? AND user_id = ?"
  ).get(id, userId);
}

export function listConversations(userId) {
  return db.prepare(
    "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC"
  ).all(userId);
}

export function addMessage(conversationId, role, content) {
  const result = db.prepare(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
  ).run(conversationId, role, content);

  db.prepare(
    "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(conversationId);

  return db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);
}

export function getMessages(conversationId, userId) {
  return db.prepare(
    `SELECT m.*
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE m.conversation_id = ? AND c.user_id = ?
     ORDER BY m.id ASC`
  ).all(conversationId, userId);
}

export function deleteConversation(id, userId) {
  const result = db.prepare(
    "DELETE FROM conversations WHERE id = ? AND user_id = ?"
  ).run(id, userId);
  return result.changes > 0;
}

export function createMemory(userId, { memoryType = "fact", content, importance = 3, source = "user" }) {
  const clean = String(content || "").trim();
  const level = Math.min(5, Math.max(1, Number(importance) || 3));
  if (!clean) throw new Error("Memory content is required.");

  const result = db.prepare(
    `INSERT INTO memories (user_id, memory_type, content, importance, source)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, content)
     DO UPDATE SET
       memory_type = excluded.memory_type,
       importance = excluded.importance,
       source = excluded.source,
       updated_at = CURRENT_TIMESTAMP`
  ).run(userId, memoryType, clean, level, source);

  return getMemoryById(result.lastInsertRowid, userId)
    || db.prepare("SELECT * FROM memories WHERE user_id = ? AND content = ?").get(userId, clean);
}

export function getMemoryById(id, userId) {
  return db.prepare(
    "SELECT * FROM memories WHERE id = ? AND user_id = ?"
  ).get(id, userId);
}

export function listMemories(userId, limit = 50) {
  return db.prepare(
    "SELECT * FROM memories WHERE user_id = ? ORDER BY importance DESC, updated_at DESC, id DESC LIMIT ?"
  ).all(userId, Math.min(200, Math.max(1, Number(limit) || 50)));
}

export function searchMemories(userId, query, limit = 20) {
  const term = "%" + String(query || "").trim() + "%";
  return db.prepare(
    "SELECT * FROM memories WHERE user_id = ? AND content LIKE ? ORDER BY importance DESC, updated_at DESC LIMIT ?"
  ).all(userId, term, Math.min(50, Math.max(1, Number(limit) || 20)));
}

export function deleteMemory(id, userId) {
  const result = db.prepare(
    "DELETE FROM memories WHERE id = ? AND user_id = ?"
  ).run(id, userId);
  return result.changes > 0;
}

export function saveConversationSummary(conversationId, userId, summary) {
  db.prepare(
    `INSERT INTO conversation_summaries (conversation_id, user_id, summary)
     VALUES (?, ?, ?)
     ON CONFLICT(conversation_id)
     DO UPDATE SET
       summary = excluded.summary,
       updated_at = CURRENT_TIMESTAMP`
  ).run(conversationId, userId, summary);
  return getConversationSummary(conversationId, userId);
}

export function getConversationSummary(conversationId, userId) {
  return db.prepare(
    "SELECT * FROM conversation_summaries WHERE conversation_id = ? AND user_id = ?"
  ).get(conversationId, userId);
}

export function saveFileAnalysis(userId, { filename, mimeType, sizeBytes, question, result }) {
  const record = db.prepare(
    `INSERT INTO file_analyses
      (user_id, filename, mime_type, size_bytes, question, result)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, filename, mimeType, sizeBytes, question, result);

  return db.prepare("SELECT * FROM file_analyses WHERE id = ?").get(record.lastInsertRowid);
}

export function listFileAnalyses(userId, limit = 25) {
  return db.prepare(
    "SELECT id, filename, mime_type, size_bytes, question, result, created_at FROM file_analyses WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?"
  ).all(userId, Math.min(100, Math.max(1, Number(limit) || 25)));
}

export function deleteFileAnalysis(id, userId) {
  const result = db.prepare(
    "DELETE FROM file_analyses WHERE id = ? AND user_id = ?"
  ).run(id, userId);
  return result.changes > 0;
}
