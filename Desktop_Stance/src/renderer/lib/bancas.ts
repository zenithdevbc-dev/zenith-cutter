import type { Banca, BancaInput, BancaUpdatePatch } from "@shared/models";

/**
 * Bancas são 100% offline-first, mesmo padrão de clientes/produtos/
 * tecidos: leitura, criação e edição acontecem direto no SQLite local
 * (via IPC), sem depender do Supabase estar acessível.
 */
export function listBancas(): Promise<Banca[]> {
  return window.zenith.bancas.listLocal();
}

export function createBanca(input: BancaInput): Promise<Banca> {
  return window.zenith.bancas.createLocal(input);
}

export function updateBanca(id: string, patch: BancaUpdatePatch): Promise<Banca> {
  return window.zenith.bancas.updateLocal(id, patch);
}
