import { app, BrowserWindow, session } from "electron";
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
      // Achado de auditoria: estava false sem justificativa. O preload
      // só usa contextBridge/ipcRenderer (nenhum módulo Node direto),
      // então sandbox true não quebra nada e reduz a superfície de
      // ataque do renderer.
      sandbox: true,
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

// Achado de auditoria: nenhuma CSP. Só aplicada no app empacotado
// (não no `npm run dev`, pra não travar o HMR/websocket do Vite) —
// o app não carrega nada remoto além das chamadas de API do Supabase
// (fetch/XHR do @supabase/supabase-js), por isso connect-src precisa
// de https: em vez de só 'self'. style-src precisa de unsafe-inline
// porque Tailwind/shadcn injetam estilo inline em runtime.
function applyContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'none'; form-action 'none';",
        ],
      },
    });
  });
}

app.whenReady().then(() => {
  getDb();
  registerIpcHandlers();
  if (app.isPackaged) {
    applyContentSecurityPolicy();
  }
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
