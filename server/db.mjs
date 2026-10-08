// SQLite schema. The three-caretaker limit is enforced by the database itself:
// slot is CHECKed to 1..3 and UNIQUE per tank, so a fourth member row can never exist.
import { DatabaseSync } from 'node:sqlite';

export function openDb(path = 'ourtank.db') {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tanks (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
      tz TEXT NOT NULL DEFAULT 'UTC', level INTEGER NOT NULL DEFAULT 1, shells INTEGER NOT NULL DEFAULT 0,
      hunger REAL NOT NULL DEFAULT 0.6, water REAL NOT NULL DEFAULT 1, glass REAL NOT NULL DEFAULT 0, sim_ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      tank_id TEXT NOT NULL REFERENCES tanks(id), user_id TEXT NOT NULL REFERENCES users(id),
      slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 3), joined_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
      PRIMARY KEY (tank_id, user_id), UNIQUE (tank_id, slot), UNIQUE (user_id)
    );
    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tank_id TEXT NOT NULL, day INTEGER NOT NULL, text TEXT NOT NULL, user_id TEXT, ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tank_id TEXT NOT NULL, user_id TEXT, type TEXT NOT NULL, text TEXT NOT NULL, ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tank_id TEXT NOT NULL, user_id TEXT NOT NULL, text TEXT NOT NULL, ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS push_subs (
      endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, offset_min INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS push_subs_user ON push_subs (user_id);
    CREATE TABLE IF NOT EXISTS push_log ( user_id TEXT NOT NULL, ts INTEGER NOT NULL );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tank_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL,
      amount INTEGER NOT NULL, ts INTEGER NOT NULL, idem TEXT NOT NULL, UNIQUE (tank_id, user_id, idem)
    );
  `);
  try { db.exec('ALTER TABLE tanks ADD COLUMN world TEXT'); } catch { /* column already there */ }
  try { db.exec('ALTER TABLE users ADD COLUMN recovery_hash TEXT'); } catch { /* column already there */ }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_recovery ON users(recovery_hash) WHERE recovery_hash IS NOT NULL');
  return db;
}

// BEGIN IMMEDIATE takes the write lock up front, so check-then-insert sequences are atomic
// even with several server processes sharing one database file.
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch { /* already rolled back */ } throw e; }
}
