import log from "electron-log";

/**
 * Logger global do processo main (Sprint 7 — "tratamento de erros").
 * electron-log já grava em arquivo (userData/logs) sem configuração
 * extra — updater.ts já depende disso. Aqui a gente liga
 * errorHandler.startCatching(), que captura uncaughtException/
 * unhandledRejection do processo main sozinho: antes disso, uma
 * exceção não tratada ali derrubava o app sem deixar rastro nenhum.
 * showDialog:false porque o app já tem sua própria tela de
 * recuperação no renderer (ErrorBoundary) — não queremos o dialog
 * técnico nativo do Electron assustando o operador.
 */
export function initMainLogger() {
  log.errorHandler.startCatching({ showDialog: false });
}

export function logRendererError(message: string, stack?: string) {
  log.error("[renderer]", message, stack ?? "");
}

export default log;
