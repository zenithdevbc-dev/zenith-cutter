import { supabase } from './supabase';
import { randomUUID } from './uuid';
import { mapaPorId } from './join';
import { anexarNomesEQuantidade, ORDEM_CORTE_CAMPOS } from './ordensCorte';
import {
  PIPELINE_PRODUCAO,
  type IniciarProducaoInput,
  type MesaCorteComStatus,
  type OrdemCorteResumo,
  type ProducaoObservacao,
  type ProducaoObservacaoInput,
  type ProducaoPerda,
  type ProducaoPerdaInput,
  type SessaoProducao,
  type SessaoProducaoResumo,
  type StatusOrdemCorte,
} from '../models';

/**
 * Camada de dados de Produção do mobile — espelha as regras de
 * `Desktop_Stance/electron/main/db/repositories/producao.ts`, mas
 * como queries diretas no Supabase (celular é terminal fino: escreve
 * direto na nuvem, sem SQLite local — ver CLAUDE.md, decisão de
 * sincronização do módulo mobile). RLS já isola por empresa (mesma
 * política usada pelo desktop para o papel Operador), então nenhuma
 * consulta aqui filtra empresa_id manualmente.
 *
 * Sem nested select (`tabela(coluna)`) do supabase-js — usa consultas
 * simples + join manual em memória, pra não depender de nomes exatos
 * de foreign key constraint na hora de desambiguar relacionamentos.
 *
 * Limitação conhecida: diferente do desktop (que agrupa cada ação numa
 * `db.transaction()` atômica), aqui cada escrita é uma chamada de rede
 * separada — não há transação client-side. Colisão real de dados é
 * rara porque os índices únicos parciais do Postgres (mesa/ordem ativa)
 * continuam sendo a garantia final, mas uma falha de rede no meio de
 * uma sequência (ex.: sessão criada, ordem não atualizada) pode deixar
 * um estado parcial — não tratado nesta primeira versão.
 */

/** Fila de Produção: ordens 'em_fila', na ordem manual de prioridade. */
export async function listFilaProducao(): Promise<OrdemCorteResumo[]> {
  const { data, error } = await supabase
    .from('ordens_corte')
    .select(ORDEM_CORTE_CAMPOS)
    .eq('status', 'em_fila')
    .order('prioridade', { ascending: true });
  if (error) throw error;
  return anexarNomesEQuantidade(data ?? []);
}

/** Ordens em qualquer etapa do pipeline pós-fila (enfesto…pronto excluído — só as em andamento). */
export async function listEmProducao(): Promise<OrdemCorteResumo[]> {
  const { data, error } = await supabase
    .from('ordens_corte')
    .select(ORDEM_CORTE_CAMPOS)
    .in('status', PIPELINE_PRODUCAO as string[])
    .neq('status', 'pronto')
    .order('numero', { ascending: false });
  if (error) throw error;
  return anexarNomesEQuantidade(data ?? []);
}

/**
 * "Ocupada" é derivada de existir sessão ativa (em_andamento OU
 * pausada — pausar não libera a mesa), nunca uma coluna própria.
 */
export async function listMesasComStatus(): Promise<MesaCorteComStatus[]> {
  const { data: mesas, error } = await supabase
    .from('mesas_corte')
    .select('id, empresa_id, nome, observacoes, ativo, criado_em, atualizado_em')
    .order('nome', { ascending: true });
  if (error) throw error;

  const { data: sessoes, error: sessoesError } = await supabase
    .from('sessoes_producao')
    .select('id, mesa_id, ordem_id, status')
    .in('status', ['em_andamento', 'pausada']);
  if (sessoesError) throw sessoesError;

  const ordens = await mapaPorId(
    'ordens_corte',
    'id, numero',
    (sessoes ?? []).map((s) => s.ordem_id),
  );
  const sessaoPorMesa = new Map((sessoes ?? []).map((s) => [s.mesa_id, s]));

  return (mesas ?? []).map((m) => {
    const sessao = sessaoPorMesa.get(m.id);
    return {
      ...m,
      ocupada: !!sessao,
      sessao_id: sessao?.id ?? null,
      ordem_numero: sessao ? ((ordens.get(sessao.ordem_id)?.numero as number) ?? null) : null,
    };
  });
}

export async function listSessoesAtivas(): Promise<SessaoProducaoResumo[]> {
  const { data, error } = await supabase
    .from('sessoes_producao')
    .select(
      'id, empresa_id, ordem_id, mesa_id, status, iniciado_por, iniciado_em, finalizado_em, pausado_em, tempo_pausado_segundos',
    )
    .in('status', ['em_andamento', 'pausada'])
    .order('iniciado_em', { ascending: false });
  if (error) throw error;
  const sessoes = data ?? [];
  if (sessoes.length === 0) return [];

  const [ordens, mesas, usuarios] = await Promise.all([
    mapaPorId('ordens_corte', 'id, numero, produto_id', sessoes.map((s) => s.ordem_id)),
    mapaPorId('mesas_corte', 'id, nome', sessoes.map((s) => s.mesa_id)),
    mapaPorId('usuarios', 'id, nome', sessoes.map((s) => s.iniciado_por)),
  ]);

  return sessoes.map((s) => ({
    ...s,
    status: s.status as SessaoProducao['status'],
    ordem_numero: (ordens.get(s.ordem_id)?.numero as number) ?? 0,
    produto_id: (ordens.get(s.ordem_id)?.produto_id as string) ?? '',
    mesa_nome: (mesas.get(s.mesa_id)?.nome as string) ?? '',
    iniciado_por_nome: (usuarios.get(s.iniciado_por)?.nome as string) ?? 'Usuário',
  }));
}

async function registrarHistorico(params: {
  empresaId: string;
  ordemId: string;
  usuarioId: string;
  acao: string;
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
  // Histórico é auditoria (CLAUDE.md 3.5) — falha aqui não deve
  // impedir a ação operacional já concluída, só fica sem log.
  if (error) console.warn('Falha ao registrar histórico:', error.message);
}

function erroAmigavel(error: { code?: string; message: string }, ocupada: string, dobrada: string): Error {
  // 23505 = unique_violation (Postgres) — mesma garantia final que os
  // índices únicos parciais dão no desktop, ver comentário do topo.
  if (error.code === '23505') {
    if (error.message.includes('mesa_id')) return new Error(ocupada);
    if (error.message.includes('ordem_id')) return new Error(dobrada);
  }
  return new Error(error.message);
}

/**
 * Início de produção (regra 3.1: seleção manual de mesa + confirmação
 * explícita — nunca automático). Cria a sessão, move a ordem de
 * 'em_fila' para 'enfesto' e registra no histórico. A mesa fica
 * ocupada por 'enfesto' e 'corte' juntos (mesma sessão) — só libera ao
 * avançar de 'corte' pra 'embalagem'.
 */
export async function iniciarProducao(
  input: IniciarProducaoInput,
  usuarioId: string,
): Promise<SessaoProducao> {
  const { data: ordem, error: ordemError } = await supabase
    .from('ordens_corte')
    .select('id, empresa_id, status')
    .eq('id', input.ordem_id)
    .single();
  if (ordemError || !ordem) throw new Error('Ordem de corte não encontrada.');
  if (ordem.status !== 'em_fila') {
    throw new Error('Esta ordem não está na fila de produção.');
  }

  const { data: mesa, error: mesaError } = await supabase
    .from('mesas_corte')
    .select('id, nome, ativo')
    .eq('id', input.mesa_id)
    .single();
  if (mesaError || !mesa) throw new Error('Mesa de corte não encontrada.');
  if (!mesa.ativo) throw new Error('Esta mesa de corte está inativa.');

  const now = new Date().toISOString();
  const { data: sessao, error: insertError } = await supabase
    .from('sessoes_producao')
    .insert({
      id: randomUUID(),
      empresa_id: ordem.empresa_id,
      ordem_id: ordem.id,
      mesa_id: mesa.id,
      status: 'em_andamento',
      iniciado_por: usuarioId,
      iniciado_em: now,
    })
    .select()
    .single();
  if (insertError || !sessao) {
    throw erroAmigavel(
      insertError ?? { message: 'Falha ao iniciar produção.' },
      'Esta mesa já está ocupada.',
      'Esta ordem já está em produção.',
    );
  }

  const { error: updateError } = await supabase
    .from('ordens_corte')
    .update({ status: 'enfesto' })
    .eq('id', ordem.id);
  if (updateError) throw new Error(updateError.message);

  await registrarHistorico({
    empresaId: ordem.empresa_id,
    ordemId: ordem.id,
    usuarioId,
    acao: 'mudanca_status',
    descricao: `Produção iniciada na mesa "${mesa.nome}".`,
  });

  return sessao as SessaoProducao;
}

/**
 * Avança a ordem uma etapa do pipeline pós-fila, nunca pulando (regra
 * 4). A mesa fica ocupada durante 'enfesto' e 'corte' (mesma sessão);
 * só ao sair de 'corte' a sessão ativa é finalizada (libera a mesa).
 */
export async function avancarEtapaOrdem(ordemId: string, usuarioId: string) {
  const { data: ordem, error } = await supabase
    .from('ordens_corte')
    .select('id, empresa_id, status')
    .eq('id', ordemId)
    .single();
  if (error || !ordem) throw new Error('Ordem de corte não encontrada.');

  const index = PIPELINE_PRODUCAO.indexOf(ordem.status as StatusOrdemCorte);
  if (index === -1) throw new Error('Esta ordem não está em uma etapa do pipeline de produção.');
  if (index === PIPELINE_PRODUCAO.length - 1) {
    throw new Error('Esta ordem já está pronta — não há próxima etapa.');
  }
  const proximo = PIPELINE_PRODUCAO[index + 1];

  if (ordem.status === 'enfesto' || ordem.status === 'corte') {
    const { data: pausada } = await supabase
      .from('sessoes_producao')
      .select('id')
      .eq('ordem_id', ordemId)
      .eq('status', 'pausada')
      .maybeSingle();
    if (pausada) throw new Error('Retome a produção antes de avançar de etapa.');
  }

  if (ordem.status === 'corte') {
    const now = new Date().toISOString();
    const { data: ativa } = await supabase
      .from('sessoes_producao')
      .select('id')
      .eq('ordem_id', ordemId)
      .eq('status', 'em_andamento')
      .maybeSingle();
    if (ativa) {
      const { error: finalizarError } = await supabase
        .from('sessoes_producao')
        .update({ status: 'finalizada', finalizado_em: now })
        .eq('id', ativa.id);
      if (finalizarError) throw new Error(finalizarError.message);
    }
  }

  const { error: updateError } = await supabase
    .from('ordens_corte')
    .update({ status: proximo })
    .eq('id', ordemId);
  if (updateError) throw new Error(updateError.message);

  await registrarHistorico({
    empresaId: ordem.empresa_id,
    ordemId,
    usuarioId,
    acao: 'mudanca_status',
    descricao: `Status alterado para "${proximo}".`,
  });
}

export async function pausarProducao(ordemId: string, usuarioId: string): Promise<void> {
  const { data: sessao, error } = await supabase
    .from('sessoes_producao')
    .select('id, empresa_id')
    .eq('ordem_id', ordemId)
    .eq('status', 'em_andamento')
    .single();
  if (error || !sessao) throw new Error('Esta ordem não tem uma sessão de produção em andamento.');

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('sessoes_producao')
    .update({ status: 'pausada', pausado_em: now })
    .eq('id', sessao.id);
  if (updateError) throw new Error(updateError.message);

  await registrarHistorico({
    empresaId: sessao.empresa_id,
    ordemId,
    usuarioId,
    acao: 'pausa',
    descricao: 'Produção pausada.',
  });
}

export async function retomarProducao(ordemId: string, usuarioId: string): Promise<void> {
  const { data: sessao, error } = await supabase
    .from('sessoes_producao')
    .select('id, empresa_id, pausado_em, tempo_pausado_segundos')
    .eq('ordem_id', ordemId)
    .eq('status', 'pausada')
    .single();
  if (error || !sessao) throw new Error('Esta ordem não tem uma sessão de produção pausada.');
  if (!sessao.pausado_em) throw new Error('Sessão pausada sem registro de início da pausa.');

  const now = new Date().toISOString();
  const segundosPausados = Math.max(
    0,
    Math.round((new Date(now).getTime() - new Date(sessao.pausado_em).getTime()) / 1000),
  );
  const novoTempoPausado = sessao.tempo_pausado_segundos + segundosPausados;

  const { error: updateError } = await supabase
    .from('sessoes_producao')
    .update({ status: 'em_andamento', pausado_em: null, tempo_pausado_segundos: novoTempoPausado })
    .eq('id', sessao.id);
  if (updateError) throw new Error(updateError.message);

  await registrarHistorico({
    empresaId: sessao.empresa_id,
    ordemId,
    usuarioId,
    acao: 'retomada',
    descricao: 'Produção retomada.',
  });
}

export async function listProducaoPerdas(sessaoId: string): Promise<ProducaoPerda[]> {
  const { data, error } = await supabase
    .from('producao_perdas')
    .select('id, sessao_id, produto_tamanho_id, quantidade, motivo, usuario_id, criado_em')
    .eq('sessao_id', sessaoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  const perdas = data ?? [];
  if (perdas.length === 0) return [];

  const [tamanhos, usuarios] = await Promise.all([
    mapaPorId(
      'produto_tamanhos',
      'id, tamanho',
      perdas.map((p) => p.produto_tamanho_id).filter((id): id is string => !!id),
    ),
    mapaPorId('usuarios', 'id, nome', perdas.map((p) => p.usuario_id)),
  ]);

  return perdas.map((p) => ({
    ...p,
    tamanho: p.produto_tamanho_id ? ((tamanhos.get(p.produto_tamanho_id)?.tamanho as string) ?? null) : null,
    usuario_nome: (usuarios.get(p.usuario_id)?.nome as string) ?? 'Usuário',
  }));
}

async function empresaDaSessao(sessaoId: string): Promise<string> {
  const { data, error } = await supabase
    .from('sessoes_producao')
    .select('empresa_id')
    .eq('id', sessaoId)
    .single();
  if (error || !data) throw new Error('Sessão de produção não encontrada.');
  return data.empresa_id as string;
}

export async function registrarProducaoPerda(
  input: ProducaoPerdaInput,
  usuarioId: string,
): Promise<void> {
  const empresaId = await empresaDaSessao(input.sessao_id);
  const { error } = await supabase.from('producao_perdas').insert({
    id: randomUUID(),
    empresa_id: empresaId,
    sessao_id: input.sessao_id,
    produto_tamanho_id: input.produto_tamanho_id ?? null,
    quantidade: input.quantidade,
    motivo: input.motivo ?? null,
    usuario_id: usuarioId,
  });
  if (error) throw new Error(error.message);
}

export async function listProducaoObservacoes(sessaoId: string): Promise<ProducaoObservacao[]> {
  const { data, error } = await supabase
    .from('producao_observacoes')
    .select('id, sessao_id, texto, usuario_id, criado_em')
    .eq('sessao_id', sessaoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  const observacoes = data ?? [];
  if (observacoes.length === 0) return [];

  const usuarios = await mapaPorId('usuarios', 'id, nome', observacoes.map((o) => o.usuario_id));
  return observacoes.map((o) => ({
    ...o,
    usuario_nome: (usuarios.get(o.usuario_id)?.nome as string) ?? 'Usuário',
  }));
}

export async function registrarProducaoObservacao(
  input: ProducaoObservacaoInput,
  usuarioId: string,
): Promise<void> {
  const empresaId = await empresaDaSessao(input.sessao_id);
  const { error } = await supabase.from('producao_observacoes').insert({
    id: randomUUID(),
    empresa_id: empresaId,
    sessao_id: input.sessao_id,
    texto: input.texto,
    usuario_id: usuarioId,
  });
  if (error) throw new Error(error.message);
}
