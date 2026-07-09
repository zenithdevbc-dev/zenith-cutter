import type { Tecido, TecidoInput, TecidoUpdatePatch } from "@shared/models";

/**
 * Tecidos são 100% offline-first, mesmo padrão de clientes/produtos:
 * leitura, criação e edição acontecem direto no SQLite local (via IPC),
 * sem depender do Supabase estar acessível.
 */
export function listTecidos(): Promise<Tecido[]> {
  return window.zenith.tecidos.listLocal();
}

export function createTecido(input: TecidoInput): Promise<Tecido> {
  return window.zenith.tecidos.createLocal(input);
}

export function updateTecido(id: string, patch: TecidoUpdatePatch): Promise<Tecido> {
  return window.zenith.tecidos.updateLocal(id, patch);
}
