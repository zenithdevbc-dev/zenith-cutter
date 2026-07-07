export interface DbStatus {
  path: string;
  schemaVersion: number;
}

export const IPC_CHANNELS = {
  dbGetStatus: "db:get-status",
} as const;
