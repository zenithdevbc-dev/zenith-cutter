import { supabase } from './supabase';
import { randomUUID } from './uuid';
import { mapaPorId } from './join';
import { registrarHistorico } from './historico';
import {
  PIPELINE_PRODUCAO,
  type OrdemCorte,
  type OrdemCorteHistoricoEntry,
  type OrdemCorteInput,
  type OrdemCorteItem,
  type OrdemCorteResumo,
  type OrdemCorteUpdatePatch,
  type StatusOrdemCorte,
} from '../models';

const STATUS_LABEL: Record<StatusOrdemCorte, string> = {
  planejado: 'Planejado',
  em_fila: 'Em Fila',
  cancelada: 'Cancelada',
  enfesto: 'Enfesto',
  corte: 'Corte',
  embalagem: 'Embalagem',
  despacho: 'Despache',
  pronto: 'Pronto',
};

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

/** Grade de quantidade por tamanho de uma ordem específica. */
export async function listOrdemCorteItens(ordemId: string): Promise<OrdemCorteItem[]> {
  const { data, error } = await supabase
    .from('ordem_corte_itens')
    .select('id, empresa_id, ordem_id, produto_tamanho_id, quantidade')
    .eq('ordem_id', ordemId);
  if (error) throw error;
  const itens = data ?? [];
  if (itens.length === 0) return [];

  const tamanhos = await mapaPorId(
    'produto_tamanhos',
    'id, tamanho, ordem',
    itens.map((i) => i.produto_tamanho_id),
  );
  return itens
    .map((i) => ({ ...i, tamanho: (tamanhos.get(i.produto_tamanho_id)?.tamanho as string) ?? '' }))
    .sort(
      (a, b) =>
        ((tamanhos.get(a.produto_tamanho_id)?.ordem as number) ?? 0) -
        ((tamanhos.get(b.produto_tamanho_id)?.ordem as number) ?? 0),
    );
}

/** Histórico de auditoria de uma ordem (mais recente primeiro). */
export async function listOrdemCorteHistorico(ordemId: string): Promise<OrdemCorteHistoricoEntry[]> {
  const { data, error } = await supabase
    .from('ordem_corte_historico')
    .select('id, empresa_id, ordem_id, usuario_id, acao, descricao, criado_em')
    .eq('ordem_id', ordemId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  const entradas = data ?? [];
  if (entradas.length === 0) return [];

  const usuarios = await mapaPorId('usuarios', 'id, nome', entradas.map((e) => e.usuario_id));
  return entradas.map((e) => ({
    ...e,
    usuario_nome: (usuarios.get(e.usuario_id)?.nome as string) ?? 'Usuário',
  }));
}

/** Sugestão de número (maior já usado na empresa + 1) — só sugestão, o usuário pode digitar outro. */
export async function getNextOrdemCorteNumero(empresaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('ordens_corte')
    .select('numero')
    .eq('empresa_id', empresaId)
    .order('numero', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0].numero + 1 : 1;
}

async function getNextPrioridadeFila(empresaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('ordens_corte')
    .select('prioridade')
    .eq('empresa_id', empresaId)
    .order('prioridade', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? data[0].prioridade + 1 : 0;
}

/**
 * Ordem nasce 'planejado' (nunca entra automaticamente em 'em_fila' —
 * precisa de ação manual de admin/supervisor via Editar Status).
 */
export async function createOrdemCorte(input: OrdemCorteInput, usuarioId: string): Promise<OrdemCorte> {
  const now = new Date().toISOString();
  const ordem: OrdemCorte = {
    id: randomUUID(),
    empresa_id: input.empresa_id,
    numero: input.numero,
    cliente_id: input.cliente_id,
    produto_id: input.produto_id,
    tecido_id: input.tecido_id,
    status: 'planejado',
    prioridade: await getNextPrioridadeFila(input.empresa_id),
    observacoes: input.observacoes ?? null,
    mesa_atribuida_id: null,
    prazo: input.prazo ?? null,
    banca_id: input.banca_id ?? null,
    arquivada: false,
    criado_em: now,
    atualizado_em: now,
  };

  const { error } = await supabase.from('ordens_corte').insert(ordem);
  if (error) {
    if (error.code === '23505') {
      throw new Error(`Já existe uma ordem de corte com o número ${input.numero} nesta empresa.`);
    }
    throw new Error(error.message);
  }

  const itensPayload = input.itens.map((item) => ({
    id: randomUUID(),
    empresa_id: input.empresa_id,
    ordem_id: ordem.id,
    produto_tamanho_id: item.produto_tamanho_id,
    quantidade: item.quantidade,
  }));
  if (itensPayload.length > 0) {
    const { error: itensError } = await supabase.from('ordem_corte_itens').insert(itensPayload);
    if (itensError) throw new Error(itensError.message);
  }

  await registrarHistorico({
    empresaId: input.empresa_id,
    ordemId: ordem.id,
    usuarioId,
    acao: 'criacao',
    descricao: 'Ordem de corte criada.',
  });

  return ordem;
}

/**
 * Edição — cliente/produto/tecido/observações/prazo/banca/status/itens.
 * `status` só pode ir para 'planejado'/'em_fila'/'cancelada' por aqui
 * (etapas do pipeline de produção — enfesto..pronto — só são setadas
 * por `iniciarProducao`/`avancarEtapaOrdem`, nunca por edição livre).
 */
export async function updateOrdemCorte(
  id: string,
  patch: OrdemCorteUpdatePatch,
  usuarioId: string,
): Promise<void> {
  const { data: atual, error: buscaError } = await supabase
    .from('ordens_corte')
    .select('empresa_id, status')
    .eq('id', id)
    .single();
  if (buscaError || !atual) throw new Error('Ordem de corte não encontrada.');

  if (
    patch.status !== undefined &&
    PIPELINE_PRODUCAO.includes(patch.status) &&
    patch.status !== atual.status
  ) {
    throw new Error(
      `Status "${STATUS_LABEL[patch.status]}" só pode ser definido pelo fluxo de produção (Iniciar / Avançar etapa), não por edição direta.`,
    );
  }

  const { itens, ...camposOrdem } = patch;
  const { error } = await supabase
    .from('ordens_corte')
    .update({ ...camposOrdem, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);

  if (itens !== undefined) {
    const { error: deleteError } = await supabase.from('ordem_corte_itens').delete().eq('ordem_id', id);
    if (deleteError) throw new Error(deleteError.message);
    if (itens.length > 0) {
      const itensPayload = itens.map((item) => ({
        id: randomUUID(),
        empresa_id: atual.empresa_id,
        ordem_id: id,
        produto_tamanho_id: item.produto_tamanho_id,
        quantidade: item.quantidade,
      }));
      const { error: insertError } = await supabase.from('ordem_corte_itens').insert(itensPayload);
      if (insertError) throw new Error(insertError.message);
    }
  }

  const statusMudou = patch.status !== undefined && patch.status !== atual.status;
  const outrosCamposMudaram =
    patch.cliente_id !== undefined ||
    patch.produto_id !== undefined ||
    patch.tecido_id !== undefined ||
    patch.observacoes !== undefined ||
    patch.prazo !== undefined ||
    patch.banca_id !== undefined ||
    itens !== undefined;

  if (statusMudou) {
    await registrarHistorico({
      empresaId: atual.empresa_id,
      ordemId: id,
      usuarioId,
      acao: patch.status === 'cancelada' ? 'cancelamento' : 'mudanca_status',
      descricao: `Status alterado de "${STATUS_LABEL[atual.status as StatusOrdemCorte]}" para "${STATUS_LABEL[patch.status as StatusOrdemCorte]}".`,
    });
  }
  if (outrosCamposMudaram) {
    await registrarHistorico({
      empresaId: atual.empresa_id,
      ordemId: id,
      usuarioId,
      acao: 'edicao',
      descricao: 'Dados da ordem de corte editados.',
    });
  }
}

/**
 * Duplicar cria uma ordem nova (id/número novos, status volta pra
 * 'planejado') copiando cliente/produto/tecido/observações/itens —
 * NÃO copia banca_id/prazo/mesa_atribuida_id.
 */
export async function duplicateOrdemCorte(id: string, usuarioId: string): Promise<OrdemCorte> {
  const { data: original, error } = await supabase
    .from('ordens_corte')
    .select('empresa_id, cliente_id, produto_id, tecido_id, observacoes')
    .eq('id', id)
    .single();
  if (error || !original) throw new Error('Ordem de corte não encontrada.');

  const { data: itensOriginais, error: itensError } = await supabase
    .from('ordem_corte_itens')
    .select('produto_tamanho_id, quantidade')
    .eq('ordem_id', id);
  if (itensError) throw itensError;

  const numero = await getNextOrdemCorteNumero(original.empresa_id);
  const nova = await createOrdemCorte(
    {
      empresa_id: original.empresa_id,
      numero,
      cliente_id: original.cliente_id,
      produto_id: original.produto_id,
      tecido_id: original.tecido_id,
      observacoes: original.observacoes,
      itens: itensOriginais ?? [],
    },
    usuarioId,
  );

  await registrarHistorico({
    empresaId: original.empresa_id,
    ordemId: nova.id,
    usuarioId,
    acao: 'duplicacao',
    descricao: `Ordem de corte duplicada a partir de outra ordem (${id.slice(0, 8)}).`,
  });

  return nova;
}

/** Arquivar — só permitido quando `status === 'cancelada'`, esconde a ordem da lista padrão. Sem DELETE físico. */
export async function arquivarOrdem(id: string, usuarioId: string): Promise<void> {
  const { data: atual, error } = await supabase
    .from('ordens_corte')
    .select('empresa_id, status, arquivada')
    .eq('id', id)
    .single();
  if (error || !atual) throw new Error('Ordem de corte não encontrada.');
  if (atual.status !== 'cancelada') {
    throw new Error('Só é possível arquivar uma ordem de corte já cancelada.');
  }
  if (atual.arquivada) {
    throw new Error('Esta ordem de corte já está arquivada.');
  }

  const { error: updateError } = await supabase
    .from('ordens_corte')
    .update({ arquivada: true, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (updateError) throw new Error(updateError.message);

  await registrarHistorico({
    empresaId: atual.empresa_id,
    ordemId: id,
    usuarioId,
    acao: 'arquivamento',
    descricao: 'Ordem de corte arquivada.',
  });
}
