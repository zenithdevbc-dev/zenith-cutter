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
} as const;
