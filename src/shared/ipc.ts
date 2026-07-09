export interface DbStatus {
  path: string;
  schemaVersion: number;
}

export interface SyncStatus {
  pendingCount: number;
}

export const IPC_CHANNELS = {
  dbGetStatus: "db:get-status",
  syncGetStatus: "sync:get-status",
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
  empresasCache: "empresas:cache",
  empresasGetLocal: "empresas:get-local",
} as const;
