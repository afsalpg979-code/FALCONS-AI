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
  return db.prepare("UPDATE conversations SET user_id = ? WHERE user_id IS NULL").run(userId).changes;
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
