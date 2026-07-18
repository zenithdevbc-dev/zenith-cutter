import { dialog } from "electron";
import fs from "node:fs";
import Database from "better-sqlite3";
import { getDb, getDbPath, closeDb } from "./db";
import log from "./log";
import type { BackupRestoreResult } from "../../src/shared/ipc";

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

// Guarda contra selecionar um arquivo qualquer por engano: só aceita
// arquivos que tenham a tabela de controle de migrations do próprio
// projeto (todo banco/backup do Zenith Cutter tem essa tabela).
function isValidBackupFile(filePath: string): boolean {
  try {
    const test = new Database(filePath, { readonly: true, fileMustExist: true });
    const row = test
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .get();
    test.close();
    return !!row;
  } catch {
    return false;
  }
}

/**
 * Restauração é destrutiva (substitui todo o banco local atual) — o
 * chamador (renderer) já deve ter confirmado com PIN antes de invocar
 * isso, reforça CLAUDE.md 3.1. Fecha a conexão viva, remove os
 * sidecars de WAL do banco atual (o arquivo de backup em si é um
 * snapshot único, sem WAL) e copia o backup por cima. Reabre em
 * seguida (reaplica migrations se o backup for de uma versão de
 * schema mais antiga) — ainda assim o app pede reinício manual,
 * porque o estado em memória do renderer (React) ficaria
 * inconsistente com o banco trocado embaixo dele.
 */
export async function restoreBackup(): Promise<BackupRestoreResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Selecionar arquivo de backup",
    filters: [{ name: "Banco SQLite", extensions: ["sqlite"] }],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0) return "cancelled";
  const backupPath = filePaths[0];

  if (!isValidBackupFile(backupPath)) {
    log.warn("[backup] arquivo de restauração inválido:", backupPath);
    return "invalid";
  }

  closeDb();

  const livePath = getDbPath();
  for (const suffix of ["-wal", "-shm"]) {
    const sidecar = livePath + suffix;
    if (fs.existsSync(sidecar)) fs.rmSync(sidecar);
  }
  fs.copyFileSync(backupPath, livePath);

  getDb();
  log.info("[backup] banco local restaurado a partir de", backupPath);
  return "restored";
}
