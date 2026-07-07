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
} as const;
