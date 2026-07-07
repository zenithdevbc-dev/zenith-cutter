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
  empresasCache: "empresas:cache",
  empresasGetLocal: "empresas:get-local",
} as const;
