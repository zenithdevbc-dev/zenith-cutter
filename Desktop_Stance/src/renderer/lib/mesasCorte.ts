import type { MesaCorte, MesaCorteInput, MesaCorteUpdatePatch } from "@shared/models";

/**
 * Mesas de corte são 100% offline-first, mesmo padrão de
 * clientes/produtos/tecidos: leitura, criação e edição acontecem
 * direto no SQLite local (via IPC), sem depender do Supabase estar
 * acessível.
 */
export function listMesasCorte(): Promise<MesaCorte[]> {
  return window.zenith.mesasCorte.listLocal();
}

export function createMesaCorte(input: MesaCorteInput): Promise<MesaCorte> {
  return window.zenith.mesasCorte.createLocal(input);
}

export function updateMesaCorte(id: string, patch: MesaCorteUpdatePatch): Promise<MesaCorte> {
  return window.zenith.mesasCorte.updateLocal(id, patch);
}
