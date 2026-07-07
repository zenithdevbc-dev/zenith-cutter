import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type DbStatus, type SyncStatus } from "../../src/shared/ipc";

contextBridge.exposeInMainWorld("zenith", {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  db: {
    getStatus: (): Promise<DbStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.dbGetStatus),
  },
  sync: {
    getStatus: (): Promise<SyncStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.syncGetStatus),
  },
  updater: {
    onUpdateDownloaded: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.updaterUpdateDownloaded, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.updaterUpdateDownloaded, listener);
    },
    quitAndInstall: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.updaterQuitAndInstall),
  },
});
