import type { OrdemCorteResumo } from "@shared/models";

/**
 * Fila de Produção: ordens 'em_fila' ordenadas por prioridade manual.
 * Mesmo padrão offline-first das demais tabelas de negócio.
 */
export function listFilaProducao(): Promise<OrdemCorteResumo[]> {
  return window.zenith.filaProducao.listLocal();
}

export function reorderFilaProducao(
  orderedIds: string[],
  usuarioId: string,
): Promise<OrdemCorteResumo[]> {
  return window.zenith.filaProducao.reorderLocal(orderedIds, usuarioId);
}
