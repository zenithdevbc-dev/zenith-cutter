import Database from "better-sqlite3";
import { app } from "electron";
import path from "node:path";
import { migrations } from "./migrations";

let db: Database.Database | null = null;

export function getDbPath(): string {
  return path.join(app.getPath("userData"), "zenith-cutter.sqlite");
}

function runMigrations(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const appliedVersions = new Set(
    database
      .prepare<[], { version: number }>("SELECT version FROM schema_migrations")
      .all()
      .map((row) => row.version),
  );

  const pending = migrations
    .filter((migration) => !appliedVersions.has(migration.version))
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const applyMigration = database.transaction(() => {
      migration.up(database);
      database
        .prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)")
        .run(migration.version, migration.name);
    });
    applyMigration();
  }
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
  }
  return db;
}

/**
 * Fecha a conexão atual (checkpoint do WAL incluso) e limpa o
 * singleton — usado antes de substituir o arquivo do banco por um
 * backup (Sprint 7). Uma próxima chamada a getDb() reabre normalmente
 * contra o arquivo que estiver no disco nesse momento.
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export function getSchemaVersion(): number {
  const database = getDb();
  const row = database
    .prepare<[], { version: number }>(
      "SELECT MAX(version) as version FROM schema_migrations",
    )
    .get();
  return row?.version ?? 0;
}
