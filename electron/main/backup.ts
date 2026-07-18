import { dialog } from "electron";
import { getDb } from "./db";
import log from "./log";

function defaultFileName(): string {
  const hoje = new Date().toISOString().slice(0, 10);
  return `zenith-cutter-backup-${hoje}.sqlite`;
}

/**
 * Backup manual do banco local (Sprint 7). Usa o backup nativo do
 * better-sqlite3 (hot backup) em vez de copiar o arquivo .sqlite
 * direto — o banco roda em modo WAL, então uma cópia de arquivo
 * simples poderia deixar de fora dado ainda não migrado do WAL pro
 * banco principal.
 */
export async function runBackup(): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Salvar backup do banco local",
    defaultPath: defaultFileName(),
    filters: [{ name: "Banco SQLite", extensions: ["sqlite"] }],
  });

  if (canceled || !filePath) return null;

  await getDb().backup(filePath);
  log.info("[backup] banco local salvo em", filePath);
  return filePath;
}
