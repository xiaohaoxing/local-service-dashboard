import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const dataDir = join(homedir(), ".local", "share", "local-service-dashboard");
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, "services.db");
export const db = new Database(dbPath);

db.exec("PRAGMA journal_mode=WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    icon TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    isActive INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);
