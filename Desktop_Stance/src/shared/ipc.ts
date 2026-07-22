export interface DbStatus {
  path: string;
  schemaVersion: number;
}

export interface SyncStatus {
  pendingCount: number;
}

export type SyncOperation = "insert" | "update" | "delete";

export interface PendingSyncItem {
  id: number;
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  payload: unknown;
  retryCount: number;
  errorMessage: string | null;
}

export type SyncLogTrigger = "manual" | "login" | "auto" | "reconexao";

export interface SyncLogEntry {
  id: number;
  trigger: SyncLogTrigger;
  attempted: number;
  synced: number;
  failed: number;
  criadoEm: string;
}

export interface SyncLogRecordInput {
  trigger: SyncLogTrigger;
  attempted: number;
  synced: number;
  failed: number;
}

export interface LogReportErrorInput {
  message: string;
  stack?: string;
}

export type BackupRestoreResult = "cancelled" | "invalid" | "restored";

export const IPC_CHANNELS = {
  dbGetStatus: "db:get-status",
  logReportError: "log:report-error",
  backupRun: "backup:run",
  backupRestore: "backup:restore",
  syncGetStatus: "sync:get-status",
  syncListPending: "sync:list-pending",
  syncMarkSuccess: "sync:mark-success",
  syncMarkError: "sync:mark-error",
  syncListErrors: "sync:list-errors",
  syncResetError: "sync:reset-error",
  syncLogRecord: "sync:log-record",
  syncLogList: "sync:log-list",
  updaterUpdateAvailable: "updater:update-available",
  updaterUpdateDownloaded: "updater:update-downloaded",
  updaterQuitAndInstall: "updater:quit-and-install",
  usuariosListLocal: "usuarios:list-local",
  usuariosCache: "usuarios:cache",
  usuariosUpdateLocal: "usuarios:update-local",
  clientesListLocal: "clientes:list-local",
  clientesCreateLocal: "clientes:create-local",
  clientesUpdateLocal: "clientes:update-local",
  clientesCacheLocal: "clientes:cache-local",
  produtosListLocal: "produtos:list-local",
  produtosCreateLocal: "produtos:create-local",
  produtosUpdateLocal: "produtos:update-local",
  produtosCacheLocal: "produtos:cache-local",
  tecidosListLocal: "tecidos:list-local",
  tecidosCreateLocal: "tecidos:create-local",
  tecidosUpdateLocal: "tecidos:update-local",
  tecidosCacheLocal: "tecidos:cache-local",
  mesasCorteListLocal: "mesas-corte:list-local",
  mesasCorteCreateLocal: "mesas-corte:create-local",
  mesasCorteUpdateLocal: "mesas-corte:update-local",
  mesasCorteCacheLocal: "mesas-corte:cache-local",
  bancasListLocal: "bancas:list-local",
  bancasCreateLocal: "bancas:create-local",
  bancasUpdateLocal: "bancas:update-local",
  bancasCacheLocal: "bancas:cache-local",
  produtoTamanhosListLocal: "produto-tamanhos:list-local",
  produtoTamanhosCreateLocal: "produto-tamanhos:create-local",
  produtoTamanhosUpdateLocal: "produto-tamanhos:update-local",
  produtoTamanhosReorderLocal: "produto-tamanhos:reorder-local",
  produtoTamanhosCacheLocal: "produto-tamanhos:cache-local",
  ordensCorteListLocal: "ordens-corte:list-local",
  ordensCorteCreateLocal: "ordens-corte:create-local",
  ordensCorteUpdateLocal: "ordens-corte:update-local",
  ordensCorteDuplicateLocal: "ordens-corte:duplicate-local",
  ordensCorteItensListLocal: "ordens-corte:itens-list-local",
  ordensCorteHistoricoListLocal: "ordens-corte:historico-list-local",
  ordensCorteNextNumeroLocal: "ordens-corte:next-numero-local",
  ordensCorteAtribuirMesaLocal: "ordens-corte:atribuir-mesa-local",
  ordensCorteCacheLocal: "ordens-corte:cache-local",
  ordensCorteItensCacheLocal: "ordens-corte:itens-cache-local",
  ordensCorteHistoricoCacheLocal: "ordens-corte:historico-cache-local",
  filaProducaoListLocal: "fila-producao:list-local",
  filaProducaoReorderLocal: "fila-producao:reorder-local",
  producaoMesasListLocal: "producao:mesas-list-local",
  producaoIniciarLocal: "producao:iniciar-local",
  producaoSessoesAtivasListLocal: "producao:sessoes-ativas-list-local",
  producaoAvancarEtapaLocal: "producao:avancar-etapa-local",
  producaoPausarLocal: "producao:pausar-local",
  producaoRetomarLocal: "producao:retomar-local",
  producaoPerdasListLocal: "producao:perdas-list-local",
  producaoPerdasListPorOrdemLocal: "producao:perdas-list-por-ordem-local",
  producaoPerdasRegistrarLocal: "producao:perdas-registrar-local",
  producaoObservacoesListLocal: "producao:observacoes-list-local",
  producaoObservacoesRegistrarLocal: "producao:observacoes-registrar-local",
  producaoSessoesCacheLocal: "producao:sessoes-cache-local",
  producaoPerdasCacheLocal: "producao:perdas-cache-local",
  producaoObservacoesCacheLocal: "producao:observacoes-cache-local",
  empresasCache: "empresas:cache",
  empresasGetLocal: "empresas:get-local",
  sessionSetEmpresaLocal: "session:set-empresa-local",
  sessionClearEmpresaLocal: "session:clear-empresa-local",
  relatoriosProducaoListLocal: "relatorios:producao-list-local",
  relatoriosPerdasListLocal: "relatorios:perdas-list-local",
} as const;
