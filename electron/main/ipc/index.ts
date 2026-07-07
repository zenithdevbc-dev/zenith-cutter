import { ipcMain, app } from "electron";
import path from "node:path";
import { IPC_CHANNELS, type DbStatus, type SyncStatus } from "../../../src/shared/ipc";
import { getDb, getSchemaVersion } from "../db";
import { getPendingSyncCount } from "../sync/queue";

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.dbGetStatus, (): DbStatus => {
    return {
      path: path.join(app.getPath("userData"), "zenith-cutter.sqlite"),
      schemaVersion: getSchemaVersion(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.syncGetStatus, (): SyncStatus => {
    return {
      pendingCount: getPendingSyncCount(getDb()),
    };
  });
}
