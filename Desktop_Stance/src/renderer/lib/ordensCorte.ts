import type {
  OrdemCorte,
  OrdemCorteResumo,
  OrdemCorteItem,
  OrdemCorteInput,
  OrdemCorteUpdatePatch,
  OrdemCorteHistoricoEntry,
} from "@shared/models";

/**
 * Ordens de Corte são 100% offline-first, mesmo padrão das demais
 * tabelas de negócio: leitura, criação, edição e duplicação acontecem
 * direto no SQLite local (via IPC). usuarioId identifica quem fez a
 * ação para o histórico de auditoria (CLAUDE.md 3.5).
 */
export function listOrdensCorte(): Promise<OrdemCorteResumo[]> {
  return window.zenith.ordensCorte.listLocal();
}

export function listOrdemCorteItens(ordemId: string): Promise<OrdemCorteItem[]> {
  return window.zenith.ordensCorte.itensListLocal(ordemId);
}

export function listOrdemCorteHistorico(ordemId: string): Promise<OrdemCorteHistoricoEntry[]> {
  return window.zenith.ordensCorte.historicoListLocal(ordemId);
}

export function getNextOrdemCorteNumero(empresaId: string): Promise<number> {
  return window.zenith.ordensCorte.nextNumeroLocal(empresaId);
}

export function createOrdemCorte(
  input: OrdemCorteInput,
  usuarioId: string,
): Promise<OrdemCorte> {
  return window.zenith.ordensCorte.createLocal(input, usuarioId);
}

export function updateOrdemCorte(
  id: string,
  patch: OrdemCorteUpdatePatch,
  usuarioId: string,
): Promise<OrdemCorte> {
  return window.zenith.ordensCorte.updateLocal(id, patch, usuarioId);
}

export function duplicateOrdemCorte(id: string, usuarioId: string): Promise<OrdemCorte> {
  return window.zenith.ordensCorte.duplicateLocal(id, usuarioId);
}

/**
 * Pré-atribuição de mesa na fila (antes de iniciar) — organização da
 * fila, não uma transição de estado (regra 3.1), por isso sem PIN.
 */
export function atribuirMesaOrdem(
  ordemId: string,
  mesaAtribuidaId: string | null,
  usuarioId: string,
): Promise<OrdemCorteResumo> {
  return window.zenith.ordensCorte.atribuirMesaLocal(ordemId, mesaAtribuidaId, usuarioId);
}
