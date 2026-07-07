import type { DbStatus, SyncStatus } from "@shared/ipc";
import type { Usuario, UsuarioUpdatePatch } from "@shared/models";

declare global {
  interface Window {
    zenith: {
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      db: {
        getStatus: () => Promise<DbStatus>;
      };
      sync: {
        getStatus: () => Promise<SyncStatus>;
      };
      updater: {
        onUpdateDownloaded: (callback: () => void) => () => void;
        quitAndInstall: () => Promise<void>;
      };
      usuarios: {
        listLocal: () => Promise<Usuario[]>;
        cache: (usuarios: Usuario[]) => Promise<void>;
        updateLocal: (id: string, patch: UsuarioUpdatePatch) => Promise<Usuario>;
      };
    };
  }
}

export {};
