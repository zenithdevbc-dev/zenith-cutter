import type Database from "better-sqlite3";

export type SyncLogTrigger = "manual" | "login" | "auto" | "reconexao";

export interface SyncLogEntry {
  id: number;
  trigger: SyncLogTrigger;
  attempted: number;
  synced: number;
  failed: number;
  criadoEm: string;
}

interface SyncLogRow {
  id: number;
  trigger: SyncLogTrigger;
  attempted: number;
  synced: number;
  failed: number;
  criado_em: string;
}

// Log operacional do próprio motor de sync (não é auditoria de ação de
// usuário) — mantém só as execuções mais recentes, sem crescer sem limite.
const MAX_LOG_ROWS = 50;

export function recordSyncLog(
  db: Database.Database,
  entry: { trigger: SyncLogTrigger; attempted: number; synced: number; failed: number },
) {
  db.prepare(
    `INSERT INTO sync_log (trigger, attempted, synced, failed) VALUES (?, ?, ?, ?)`,
  ).run(entry.trigger, entry.attempted, entry.synced, entry.failed);

  db.prepare(
    `DELETE FROM sync_log WHERE id NOT IN (
       SELECT id FROM sync_log ORDER BY id DESC LIMIT ?
     )`,
  ).run(MAX_LOG_ROWS);
}

export function listSyncLog(db: Database.Database, limit = 20): SyncLogEntry[] {
  const rows = db
    .prepare<[number], SyncLogRow>(
      "SELECT id, trigger, attempted, synced, failed, criado_em FROM sync_log ORDER BY id DESC LIMIT ?",
    )
    .all(limit);
  return rows.map((row) => ({
    id: row.id,
    trigger: row.trigger,
    attempted: row.attempted,
    synced: row.synced,
    failed: row.failed,
    criadoEm: row.criado_em,
  }));
}
