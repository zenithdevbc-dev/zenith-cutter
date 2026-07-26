import { supabase } from './supabase';
import { mapaPorId } from './join';
import type { OrdemCorteResumo, StatusOrdemCorte } from '../models';

/**
 * Camada de dados de Ordens de Corte do mobile — mesmo padrão
 * Supabase-direto de `producao.ts` (sem SQLite local). `listOrdensCorte`
 * e o join que monta `OrdemCorteResumo` (equivalente ao `RESUMO_SELECT`
 * do desktop, `electron/main/db/repositories/ordensCorte.ts`) vivem
 * aqui porque são a fonte canônica — `producao.ts` importa daqui em vez
 * de duplicar, já que a Fila/Pipeline de Produção também precisam do
 * mesmo shape, só com filtros de status diferentes.
 */

export interface OrdemCorteRow {
  id: string;
  empresa_id: string;
  numero: number;
  cliente_id: string;
  produto_id: string;
  tecido_id: string;
  status: StatusOrdemCorte;
  prioridade: number;
  observacoes: string | null;
  mesa_atribuida_id: string | null;
  prazo: string | null;
  banca_id: string | null;
  arquivada: boolean;
  criado_em: string;
  atualizado_em: string;
}

export const ORDEM_CORTE_CAMPOS =
  'id, empresa_id, numero, cliente_id, produto_id, tecido_id, status, prioridade, observacoes, mesa_atribuida_id, prazo, banca_id, arquivada, criado_em, atualizado_em';

export async function anexarNomesEQuantidade(rows: OrdemCorteRow[]): Promise<OrdemCorteResumo[]> {
  if (rows.length === 0) return [];

  const [clientes, produtos, tecidos, mesas, bancas] = await Promise.all([
    mapaPorId('clientes', 'id, nome', rows.map((r) => r.cliente_id)),
    mapaPorId('produtos', 'id, nome', rows.map((r) => r.produto_id)),
    mapaPorId('tecidos', 'id, nome', rows.map((r) => r.tecido_id)),
    mapaPorId(
      'mesas_corte',
      'id, nome',
      rows.map((r) => r.mesa_atribuida_id).filter((id): id is string => !!id),
    ),
    mapaPorId(
      'bancas',
      'id, nome',
      rows.map((r) => r.banca_id).filter((id): id is string => !!id),
    ),
  ]);

  const ids = rows.map((r) => r.id);
  const { data: itens, error } = await supabase
    .from('ordem_corte_itens')
    .select('ordem_id, quantidade')
    .in('ordem_id', ids);
  if (error) throw error;
  const quantidades = new Map<string, number>();
  for (const item of itens ?? []) {
    quantidades.set(item.ordem_id, (quantidades.get(item.ordem_id) ?? 0) + item.quantidade);
  }

  return rows.map((r) => ({
    id: r.id,
    empresa_id: r.empresa_id,
    numero: r.numero,
    cliente_id: r.cliente_id,
    cliente_nome: (clientes.get(r.cliente_id)?.nome as string) ?? '',
    produto_id: r.produto_id,
    produto_nome: (produtos.get(r.produto_id)?.nome as string) ?? '',
    tecido_id: r.tecido_id,
    tecido_nome: (tecidos.get(r.tecido_id)?.nome as string) ?? '',
    status: r.status,
    prioridade: r.prioridade,
    observacoes: r.observacoes,
    mesa_atribuida_id: r.mesa_atribuida_id,
    mesa_atribuida_nome: r.mesa_atribuida_id
      ? ((mesas.get(r.mesa_atribuida_id)?.nome as string) ?? null)
      : null,
    prazo: r.prazo,
    banca_id: r.banca_id,
    banca_nome: r.banca_id ? ((bancas.get(r.banca_id)?.nome as string) ?? null) : null,
    arquivada: r.arquivada,
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
    quantidade_total: quantidades.get(r.id) ?? 0,
  }));
}

/** Todas as ordens de corte da empresa (RLS já escopa) — admin/supervisor. */
export async function listOrdensCorte(): Promise<OrdemCorteResumo[]> {
  const { data, error } = await supabase
    .from('ordens_corte')
    .select(ORDEM_CORTE_CAMPOS)
    .order('numero', { ascending: false });
  if (error) throw error;
  return anexarNomesEQuantidade(data ?? []);
}
