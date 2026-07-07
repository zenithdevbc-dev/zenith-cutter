import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

/**
 * Migrations rodam em ordem crescente de `version`, uma única vez cada,
 * dentro de uma transação. Nunca edite uma migration já aplicada em
 * produção — crie uma nova com a próxima versão.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: "create_sync_queue",
    up: (db) => {
      db.exec(`
        CREATE TABLE sync_queue (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name    TEXT NOT NULL,
          record_id     TEXT NOT NULL,
          operation     TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
          payload       TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
          retry_count   INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          synced_at     TEXT
        );

        CREATE INDEX idx_sync_queue_status ON sync_queue (status);
      `);
    },
  },
];
