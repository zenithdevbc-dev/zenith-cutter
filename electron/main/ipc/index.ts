import { ipcMain, app } from "electron";
import path from "node:path";
import { IPC_CHANNELS, type DbStatus } from "../../../src/shared/ipc";
import { getSchemaVersion } from "../db";

export function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.dbGetStatus, (): DbStatus => {
    return {
      path: path.join(app.getPath("userData"), "zenith-cutter.sqlite"),
      schemaVersion: getSchemaVersion(),
    };
  });
}
