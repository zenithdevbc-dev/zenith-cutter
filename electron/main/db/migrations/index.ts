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
  {
    version: 2,
    name: "create_usuarios",
    up: (db) => {
      db.exec(`
        -- Espelho local da tabela public.usuarios do Supabase. O id é o
        -- mesmo uuid do auth.users (conta é sempre criada no Supabase
        -- primeiro, via Edge Function — nunca existe usuário "só local").
        CREATE TABLE usuarios (
          id            TEXT PRIMARY KEY,
          nome          TEXT NOT NULL,
          email         TEXT NOT NULL,
          papel         TEXT NOT NULL DEFAULT 'operador' CHECK (papel IN ('operador', 'administrador')),
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL,
          cached_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
      `);
    },
  },
  {
    version: 3,
    name: "create_clientes",
    up: (db) => {
      db.exec(`
        -- Diferente de usuarios, cliente nasce local (offline-first de
        -- verdade): id é gerado no app (uuid), gravado aqui primeiro, e só
        -- depois sincronizado com o Supabase via sync_queue.
        CREATE TABLE clientes (
          id            TEXT PRIMARY KEY,
          nome          TEXT NOT NULL,
          documento     TEXT,
          telefone      TEXT,
          email         TEXT,
          ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
          criado_em     TEXT NOT NULL,
          atualizado_em TEXT NOT NULL
        );

        CREATE INDEX idx_clientes_nome ON clientes (nome);
      `);
    },
  },
];
