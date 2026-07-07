import { autoUpdater } from "electron-updater";
import log from "electron-log";
import type { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../src/shared/ipc";

autoUpdater.logger = log;
// Baixa em segundo plano automaticamente (não é uma ação operacional, não
// interrompe nada), mas SÓ instala quando o operador fechar o app por
// conta própria — nunca reinicia sozinho. Ver CLAUDE.md, princípio 3.1.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

export function initAutoUpdater(mainWindow: BrowserWindow) {
  autoUpdater.on("update-downloaded", () => {
    mainWindow.webContents.send(IPC_CHANNELS.updaterUpdateDownloaded);
  });

  autoUpdater.on("error", (error) => {
    log.error("[autoUpdater]", error);
  });

  autoUpdater.checkForUpdates().catch((error) => {
    log.error("[autoUpdater] falha ao verificar atualizações:", error);
  });
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}
