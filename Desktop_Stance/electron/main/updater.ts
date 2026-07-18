import { autoUpdater } from "electron-updater";
import log from "./log";
import type { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../src/shared/ipc";

autoUpdater.logger = log;
// Baixa em segundo plano automaticamente (não é uma ação operacional, não
// interrompe nada), mas SÓ instala quando o operador fechar o app por
// conta própria — nunca reinicia sozinho. Ver CLAUDE.md, princípio 3.1.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

export function initAutoUpdater(mainWindow: BrowserWindow) {
  // Dispara assim que a checagem encontra uma versão nova — antes do
  // download (~134MB) terminar. Pedido do usuário: avisar mais cedo em
  // vez de só notificar quando o download completo já tiver acabado
  // (update-downloaded, que pode demorar dependendo da internet).
  autoUpdater.on("update-available", () => {
    mainWindow.webContents.send(IPC_CHANNELS.updaterUpdateAvailable);
  });

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
