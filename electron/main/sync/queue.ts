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

export interface PendingSyncItem {
  id: number;
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  payload: unknown;
  retryCount: number;
  errorMessage: string | null;
}

interface PendingSyncRow {
  id: number;
  table_name: string;
  record_id: string;
  operation: SyncOperation;
  payload: string;
  retry_count: number;
  error_message: string | null;
}

/**
 * Devolve a fila pendente em ordem cronológica (id crescente = ordem de
 * criação real). Essa ordem importa: uma ordem de corte só é enfileirada
 * depois do cliente/produto/tecido que ela referencia, então processar
 * em FIFO respeita as dependências (FK) sem precisar de sort por tabela.
 */
function mapRow(row: PendingSyncRow): PendingSyncItem {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    operation: row.operation,
    payload: JSON.parse(row.payload) as unknown,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
  };
}

export function listPendingSync(db: Database.Database): PendingSyncItem[] {
  const rows = db
    .prepare<[], PendingSyncRow>(
      "SELECT id, table_name, record_id, operation, payload, retry_count, error_message FROM sync_queue WHERE status = 'pending' ORDER BY id ASC",
    )
    .all();
  return rows.map(mapRow);
}

/**
 * Itens que já esgotaram as MAX_RETRIES tentativas automáticas — ficam
 * presos em status='error' até uma ação manual (Sprint 6: "resolução
 * de erros"), nunca são reprocessados sozinhos pelo loop automático.
 */
export function listErrorSync(db: Database.Database): PendingSyncItem[] {
  const rows = db
    .prepare<[], PendingSyncRow>(
      "SELECT id, table_name, record_id, operation, payload, retry_count, error_message FROM sync_queue WHERE status = 'error' ORDER BY id ASC",
    )
    .all();
  return rows.map(mapRow);
}

/**
 * Devolve um item de status='error' pra fila ('pending', tentativas
 * zeradas) — usado pelo botão "Tentar novamente" (o usuário
 * presumivelmente corrigiu o que causava o erro, então merece um novo
 * ciclo completo de tentativas, não continuar de onde parou).
 */
export function resetSyncError(db: Database.Database, id: number) {
  db.prepare(
    `UPDATE sync_queue
     SET status = 'pending', retry_count = 0, error_message = NULL
     WHERE id = ? AND status = 'error'`,
  ).run(id);
}

export function markSyncSuccess(db: Database.Database, id: number) {
  db.prepare(
    `UPDATE sync_queue
     SET status = 'synced', synced_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), error_message = NULL
     WHERE id = ?`,
  ).run(id);
}

// Depois de algumas tentativas sem sucesso, para de tentar sozinho e
// marca 'error' — precisa de intervenção manual (dado inconsistente,
// não é só falta de rede). Enquanto isso, fica 'pending' e volta a ser
// tentado na próxima sincronização.
const MAX_RETRIES = 5;

export function markSyncError(db: Database.Database, id: number, message: string) {
  const row = db
    .prepare<[number], { retry_count: number }>(
      "SELECT retry_count FROM sync_queue WHERE id = ?",
    )
    .get(id);
  const nextRetryCount = (row?.retry_count ?? 0) + 1;
  const nextStatus = nextRetryCount >= MAX_RETRIES ? "error" : "pending";
  db.prepare(
    "UPDATE sync_queue SET status = ?, retry_count = ?, error_message = ? WHERE id = ?",
  ).run(nextStatus, nextRetryCount, message, id);
}
