import type Database from "better-sqlite3";

export type SyncOperation = "insert" | "update" | "delete";

export interface EnqueueChangeParams {
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  payload: unknown;
}

/**
 * Registra uma alteração local pendente de sincronização com o Supabase.
 * Nunca chama a rede diretamente — apenas grava a intenção no SQLite.
 * O envio real (push/pull, retry, resolução de conflito) é implementado
 * no Sprint 6, respeitando o princípio de offline first.
 */
export function enqueueChange(
  db: Database.Database,
  { tableName, recordId, operation, payload }: EnqueueChangeParams,
) {
  db.prepare(
    `INSERT INTO sync_queue (table_name, record_id, operation, payload)
     VALUES (?, ?, ?, ?)`,
  ).run(tableName, recordId, operation, JSON.stringify(payload));
}

export function getPendingSyncCount(db: Database.Database): number {
  const row = db
    .prepare<[], { count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'",
    )
    .get();
  return row?.count ?? 0;
}
