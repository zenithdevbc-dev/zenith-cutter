import { supabase } from './supabase';
import { randomUUID } from './uuid';
import type { AcaoOrdemCorteHistorico } from '../models';

/**
 * Auditoria de Ordem de Corte (CLAUDE.md §3.5) — compartilhado por
 * `producao.ts` (pausa/retomada/mudança de status via pipeline) e
 * `ordensCorte.ts` (criação/edição/cancelamento/duplicação/arquivamento).
 * Falha aqui não deve impedir a ação operacional já concluída, só fica
 * sem log — mesmo tratamento best-effort do resto do mobile.
 */
export async function registrarHistorico(params: {
  empresaId: string;
  ordemId: string;
  usuarioId: string;
  acao: AcaoOrdemCorteHistorico;
  descricao: string;
}) {
  const { error } = await supabase.from('ordem_corte_historico').insert({
    id: randomUUID(),
    empresa_id: params.empresaId,
    ordem_id: params.ordemId,
    usuario_id: params.usuarioId,
    acao: params.acao,
    descricao: params.descricao,
  });
  if (error) console.warn('Falha ao registrar histórico:', error.message);
}
