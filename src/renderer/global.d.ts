import type { DbStatus, SyncStatus } from "@shared/ipc";

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
    };
  }
}

export {};
