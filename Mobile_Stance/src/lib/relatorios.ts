import { supabase } from './supabase';
import { mapaPorId } from './join';
import { listOrdensCorte } from './ordensCorte';
import type { RelatorioProducaoLinha } from '../models';

/**
 * Camada de dados de Relatórios do mobile — monta em memória o que o
 * desktop faz em SQL (`electron/main/db/repositories/relatorios.ts`):
 * uma linha por ordem de corte + dados da sessão de produção mais
 * recente dela (uma ordem tem no máximo uma sessão na prática — o fluxo
 * nunca volta pra fila depois de iniciada).
 */

interface SessaoRow {
  ordem_id: string;
  iniciado_por: string;
  iniciado_em: string;
  finalizado_em: string | null;
  tempo_pausado_segundos: number;
}

/** Uma linha por ordem de corte + sessão de produção mais recente (admin/supervisor). */
export async function listRelatorioProducao(): Promise<RelatorioProducaoLinha[]> {
  const ordens = await listOrdensCorte();

  const { data: sessoes, error } = await supabase
    .from('sessoes_producao')
    .select('ordem_id, iniciado_por, iniciado_em, finalizado_em, tempo_pausado_segundos');
  if (error) throw error;

  const maisRecentePorOrdem = new Map<string, SessaoRow>();
  for (const sessao of (sessoes ?? []) as SessaoRow[]) {
    const atual = maisRecentePorOrdem.get(sessao.ordem_id);
    if (!atual || sessao.iniciado_em > atual.iniciado_em) {
      maisRecentePorOrdem.set(sessao.ordem_id, sessao);
    }
  }

  const operadores = await mapaPorId(
    'usuarios',
    'id, nome',
    Array.from(maisRecentePorOrdem.values()).map((s) => s.iniciado_por),
  );

  return ordens.map((ordem) => {
    const sessao = maisRecentePorOrdem.get(ordem.id) ?? null;
    return {
      ordem_id: ordem.id,
      numero: ordem.numero,
      cliente_id: ordem.cliente_id,
      cliente_nome: ordem.cliente_nome,
      tecido_id: ordem.tecido_id,
      tecido_nome: ordem.tecido_nome,
      status: ordem.status,
      prazo: ordem.prazo,
      criado_em: ordem.criado_em,
      quantidade_total: ordem.quantidade_total,
      operador_id: sessao?.iniciado_por ?? null,
      operador_nome: sessao ? ((operadores.get(sessao.iniciado_por)?.nome as string) ?? null) : null,
      iniciado_em: sessao?.iniciado_em ?? null,
      finalizado_em: sessao?.finalizado_em ?? null,
      tempo_pausado_segundos: sessao?.tempo_pausado_segundos ?? 0,
      banca_id: ordem.banca_id,
      banca_nome: ordem.banca_nome,
    };
  });
}
