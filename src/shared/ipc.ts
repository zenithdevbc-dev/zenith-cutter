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
}

export const IPC_CHANNELS = {
  dbGetStatus: "db:get-status",
  syncGetStatus: "sync:get-status",
  syncListPending: "sync:list-pending",
  syncMarkSuccess: "sync:mark-success",
  syncMarkError: "sync:mark-error",
  updaterUpdateDownloaded: "updater:update-downloaded",
  updaterQuitAndInstall: "updater:quit-and-install",
  usuariosListLocal: "usuarios:list-local",
  usuariosCache: "usuarios:cache",
  usuariosUpdateLocal: "usuarios:update-local",
  clientesListLocal: "clientes:list-local",
  clientesCreateLocal: "clientes:create-local",
  clientesUpdateLocal: "clientes:update-local",
  produtosListLocal: "produtos:list-local",
  produtosCreateLocal: "produtos:create-local",
  produtosUpdateLocal: "produtos:update-local",
  tecidosListLocal: "tecidos:list-local",
  tecidosCreateLocal: "tecidos:create-local",
  tecidosUpdateLocal: "tecidos:update-local",
  mesasCorteListLocal: "mesas-corte:list-local",
  mesasCorteCreateLocal: "mesas-corte:create-local",
  mesasCorteUpdateLocal: "mesas-corte:update-local",
  produtoTamanhosListLocal: "produto-tamanhos:list-local",
  produtoTamanhosCreateLocal: "produto-tamanhos:create-local",
  produtoTamanhosUpdateLocal: "produto-tamanhos:update-local",
  produtoTamanhosReorderLocal: "produto-tamanhos:reorder-local",
  ordensCorteListLocal: "ordens-corte:list-local",
  ordensCorteCreateLocal: "ordens-corte:create-local",
  ordensCorteUpdateLocal: "ordens-corte:update-local",
  ordensCorteDuplicateLocal: "ordens-corte:duplicate-local",
  ordensCorteItensListLocal: "ordens-corte:itens-list-local",
  ordensCorteHistoricoListLocal: "ordens-corte:historico-list-local",
  ordensCorteNextNumeroLocal: "ordens-corte:next-numero-local",
  filaProducaoListLocal: "fila-producao:list-local",
  filaProducaoReorderLocal: "fila-producao:reorder-local",
  producaoMesasListLocal: "producao:mesas-list-local",
  producaoIniciarLocal: "producao:iniciar-local",
  producaoSessoesAtivasListLocal: "producao:sessoes-ativas-list-local",
  empresasCache: "empresas:cache",
  empresasGetLocal: "empresas:get-local",
} as const;
