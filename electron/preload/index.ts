import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, type DbStatus, type SyncStatus } from "../../src/shared/ipc";
import type {
  Usuario,
  UsuarioUpdatePatch,
  Cliente,
  ClienteInput,
  ClienteUpdatePatch,
} from "../../src/shared/models";

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
  usuarios: {
    listLocal: (): Promise<Usuario[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.usuariosListLocal),
    cache: (usuarios: Usuario[]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.usuariosCache, usuarios),
    updateLocal: (id: string, patch: UsuarioUpdatePatch): Promise<Usuario> =>
      ipcRenderer.invoke(IPC_CHANNELS.usuariosUpdateLocal, id, patch),
  },
  clientes: {
    listLocal: (): Promise<Cliente[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesListLocal),
    createLocal: (input: ClienteInput): Promise<Cliente> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesCreateLocal, input),
    updateLocal: (id: string, patch: ClienteUpdatePatch): Promise<Cliente> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesUpdateLocal, id, patch),
  },
});
