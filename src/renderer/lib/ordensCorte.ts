import type {
  OrdemCorte,
  OrdemCorteResumo,
  OrdemCorteItem,
  OrdemCorteInput,
  OrdemCorteUpdatePatch,
} from "@shared/models";

/**
 * Ordens de Corte são 100% offline-first, mesmo padrão das demais
 * tabelas de negócio: leitura, criação, edição e duplicação acontecem
 * direto no SQLite local (via IPC).
 */
export function listOrdensCorte(): Promise<OrdemCorteResumo[]> {
  return window.zenith.ordensCorte.listLocal();
}

export function listOrdemCorteItens(ordemId: string): Promise<OrdemCorteItem[]> {
  return window.zenith.ordensCorte.itensListLocal(ordemId);
}

export function createOrdemCorte(input: OrdemCorteInput): Promise<OrdemCorte> {
  return window.zenith.ordensCorte.createLocal(input);
}

export function updateOrdemCorte(
  id: string,
  patch: OrdemCorteUpdatePatch,
): Promise<OrdemCorte> {
  return window.zenith.ordensCorte.updateLocal(id, patch);
}

export function duplicateOrdemCorte(id: string): Promise<OrdemCorte> {
  return window.zenith.ordensCorte.duplicateLocal(id);
}
