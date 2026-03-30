const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'shelkit.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    root_cid TEXT,
    file_count INTEGER DEFAULT 0,
    subdomain TEXT UNIQUE,
    framework TEXT,
    did_build INTEGER DEFAULT 0,
    extract_dir TEXT,
    files_json TEXT,
    project_id TEXT,
    version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    name TEXT,
    repo_url TEXT,
    active_deployment_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deploy_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id TEXT NOT NULL,
    project_id TEXT,
    version INTEGER DEFAULT 1,
    root_cid TEXT,
    extract_dir TEXT,
    file_count INTEGER DEFAULT 0,
    files_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
  );

  CREATE TABLE IF NOT EXISTS custom_domains (
    domain TEXT PRIMARY KEY,
    deployment_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (deployment_id) REFERENCES deployments(id)
  );

  CREATE INDEX IF NOT EXISTS idx_custom_domains_deployment ON custom_domains(deployment_id);
  CREATE INDEX IF NOT EXISTS idx_deployments_wallet ON deployments(wallet);
  CREATE INDEX IF NOT EXISTS idx_deployments_subdomain ON deployments(subdomain);
  CREATE INDEX IF NOT EXISTS idx_deployments_deleted ON deployments(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_projects_wallet ON projects(wallet);
  CREATE INDEX IF NOT EXISTS idx_versions_deployment ON deploy_versions(deployment_id);
  CREATE INDEX IF NOT EXISTS idx_deployments_created ON deployments(created_at);
  CREATE INDEX IF NOT EXISTS idx_versions_created ON deploy_versions(created_at);
`);

// Migrations for new columns (safe to run multiple times)
try { db.exec(`ALTER TABLE deployments ADD COLUMN hits INTEGER DEFAULT 0`) } catch {}
try { db.exec(`ALTER TABLE deployments ADD COLUMN expires_at TEXT`) } catch {}

module.exports = db;
