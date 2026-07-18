import { app, BrowserWindow } from "electron";
import path from "node:path";
import { getDb } from "./db";
import { registerIpcHandlers } from "./ipc";
import { initAutoUpdater } from "./updater";
import log, { initMainLogger } from "./log";

// errorHandler.startCatching() (dentro de initMainLogger) já cobre
// uncaughtException/unhandledRejection do processo main sozinho.
initMainLogger();

// Publicados pelo vite-plugin-electron durante o build:
// process.env.VITE_DEV_SERVER_URL aponta pro dev server em desenvolvimento.
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_DIST = path.join(__dirname, "../../dist");
const APP_ICON = path.join(__dirname, "../../build/icon.png");

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Ajuda a diagnosticar "o app fechou sozinho" sem depender do
  // usuário descrever o que aconteceu (mesmo espírito do
  // uncaughtException — deixar rastro em log, não só o app sumir).
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log.error("[render-process-gone]", details.reason);
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  // Auto-update só faz sentido no app empacotado (precisa do
  // app-update.yml gerado pelo electron-builder no build de produção).
  if (app.isPackaged) {
    initAutoUpdater(mainWindow);
  }
}

app.whenReady().then(() => {
  getDb();
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
