// Cópia manual dos tipos relevantes de Desktop_Stance/src/shared/models.ts
// (ver CLAUDE.md §2.1 — sem workspace/monorepo entre as duas Stances,
// espelho do schema Supabase, que é a fonte real da verdade).

export interface Empresa {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
  criado_em: string;
}

export type PapelUsuario = 'operador' | 'supervisor' | 'administrador';

export interface Usuario {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  login: string;
  papel: PapelUsuario;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface MesaCorte {
  id: string;
  empresa_id: string;
  nome: string;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface MesaCorteInput {
  empresa_id: string;
  nome: string;
  observacoes?: string | null;
}

export interface MesaCorteUpdatePatch {
  nome?: string;
  observacoes?: string | null;
  ativo?: boolean;
}

/** "Ocupada" é derivada de existir sessão ativa (em_andamento/pausada) — nunca uma coluna própria. */
export interface MesaCorteComStatus extends MesaCorte {
  ocupada: boolean;
  sessao_id: string | null;
  ordem_numero: number | null;
}

export interface Cliente {
  id: string;
  empresa_id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ClienteInput {
  empresa_id: string;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface ClienteUpdatePatch {
  nome?: string;
  documento?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo?: boolean;
}

export interface Produto {
  id: string;
  empresa_id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ProdutoInput {
  empresa_id: string;
  nome: string;
  codigo?: string | null;
  descricao?: string | null;
}

export interface ProdutoUpdatePatch {
  nome?: string;
  codigo?: string | null;
  descricao?: string | null;
  ativo?: boolean;
}

export interface Tecido {
  id: string;
  empresa_id: string;
  nome: string;
  composicao: string | null;
  cor: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface TecidoInput {
  empresa_id: string;
  nome: string;
  composicao?: string | null;
  cor?: string | null;
}

export interface TecidoUpdatePatch {
  nome?: string;
  composicao?: string | null;
  cor?: string | null;
  ativo?: boolean;
}

export interface Banca {
  id: string;
  empresa_id: string;
  nome: string;
  responsavel: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  tipo_servico: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface BancaInput {
  empresa_id: string;
  nome: string;
  responsavel?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  endereco?: string | null;
  tipo_servico?: string | null;
  observacoes?: string | null;
}

export interface BancaUpdatePatch {
  nome?: string;
  responsavel?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  endereco?: string | null;
  tipo_servico?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
}

export type StatusOrdemCorte =
  | 'planejado'
  | 'em_fila'
  | 'cancelada'
  | 'enfesto'
  | 'corte'
  | 'embalagem'
  | 'despacho'
  | 'pronto';

/**
 * Sequência pós-fila (CLAUDE.md §4, decisão de 2026-07-21): cada etapa
 * avança manualmente, uma de cada vez. Mesa fica ocupada durante
 * 'enfesto' e 'corte' (mesma sessão), só libera saindo de 'corte'.
 */
export const PIPELINE_PRODUCAO: readonly StatusOrdemCorte[] = [
  'enfesto',
  'corte',
  'embalagem',
  'despacho',
  'pronto',
];

export const STATUS_ORDEM_CORTE_LABEL: Record<StatusOrdemCorte, string> = {
  planejado: 'Planejado',
  em_fila: 'Em Fila',
  cancelada: 'Cancelada',
  enfesto: 'Enfesto',
  corte: 'Corte',
  embalagem: 'Embalagem',
  despacho: 'Despache',
  pronto: 'Pronto',
};

export interface OrdemCorte {
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

/** Linha da fila/pipeline já com nomes resolvidos (join), evita N+1 lookups na tela. */
export interface OrdemCorteResumo extends OrdemCorte {
  cliente_nome: string;
  produto_nome: string;
  tecido_nome: string;
  quantidade_total: number;
  mesa_atribuida_nome: string | null;
  banca_nome: string | null;
}

export interface OrdemCorteItem {
  id: string;
  empresa_id: string;
  ordem_id: string;
  produto_tamanho_id: string;
  tamanho: string;
  quantidade: number;
}

export interface OrdemCorteItemInput {
  produto_tamanho_id: string;
  quantidade: number;
}

export interface OrdemCorteInput {
  empresa_id: string;
  numero: number;
  cliente_id: string;
  produto_id: string;
  tecido_id: string;
  observacoes?: string | null;
  prazo?: string | null;
  banca_id?: string | null;
  itens: OrdemCorteItemInput[];
}

export interface OrdemCorteUpdatePatch {
  cliente_id?: string;
  produto_id?: string;
  tecido_id?: string;
  observacoes?: string | null;
  prazo?: string | null;
  banca_id?: string | null;
  status?: StatusOrdemCorte;
  itens?: OrdemCorteItemInput[];
}

export type AcaoOrdemCorteHistorico =
  | 'criacao'
  | 'edicao'
  | 'mudanca_status'
  | 'cancelamento'
  | 'duplicacao'
  | 'pausa'
  | 'retomada'
  | 'arquivamento';

export interface OrdemCorteHistoricoEntry {
  id: string;
  empresa_id: string;
  ordem_id: string;
  usuario_id: string;
  usuario_nome: string;
  acao: AcaoOrdemCorteHistorico;
  descricao: string;
  criado_em: string;
}

export type StatusSessaoProducao = 'em_andamento' | 'pausada' | 'finalizada';

export interface SessaoProducao {
  id: string;
  empresa_id: string;
  ordem_id: string;
  mesa_id: string;
  status: StatusSessaoProducao;
  iniciado_por: string;
  iniciado_em: string;
  finalizado_em: string | null;
  pausado_em: string | null;
  tempo_pausado_segundos: number;
}

/** Linha já com nomes resolvidos (join) — exibida em "Em andamento". */
export interface SessaoProducaoResumo extends SessaoProducao {
  ordem_numero: number;
  produto_id: string;
  mesa_nome: string;
  iniciado_por_nome: string;
}

export interface IniciarProducaoInput {
  ordem_id: string;
  mesa_id: string;
}

export interface ProdutoTamanho {
  id: string;
  empresa_id: string;
  produto_id: string;
  tamanho: string;
  ordem: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ProdutoTamanhoInput {
  empresa_id: string;
  produto_id: string;
  tamanho: string;
}

export interface ProdutoTamanhoUpdatePatch {
  tamanho?: string;
  ativo?: boolean;
}

export interface ProducaoPerda {
  id: string;
  sessao_id: string;
  produto_tamanho_id: string | null;
  tamanho: string | null;
  quantidade: number;
  motivo: string | null;
  usuario_id: string;
  usuario_nome: string;
  criado_em: string;
}

export interface ProducaoPerdaInput {
  sessao_id: string;
  produto_tamanho_id?: string | null;
  quantidade: number;
  motivo?: string | null;
}

export interface ProducaoObservacao {
  id: string;
  sessao_id: string;
  texto: string;
  usuario_id: string;
  usuario_nome: string;
  criado_em: string;
}

export interface ProducaoObservacaoInput {
  sessao_id: string;
  texto: string;
}

/**
 * Uma linha do Relatório de Produção: uma ordem de corte + dados da sua
 * sessão de produção mais recente. Sem sessão (ordem ainda não
 * iniciada), os campos de sessão vêm null.
 */
export interface RelatorioProducaoLinha {
  ordem_id: string;
  numero: number;
  cliente_id: string;
  cliente_nome: string;
  tecido_id: string;
  tecido_nome: string;
  status: StatusOrdemCorte;
  prazo: string | null;
  criado_em: string;
  quantidade_total: number;
  operador_id: string | null;
  operador_nome: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
  tempo_pausado_segundos: number;
  banca_id: string | null;
  banca_nome: string | null;
}

/** Uma linha do Relatório de Materiais: uma perda de produção + dados da ordem/tecido/cliente dela. */
export interface RelatorioPerdaLinha {
  perda_id: string;
  ordem_id: string;
  numero: number;
  cliente_id: string;
  cliente_nome: string;
  tecido_id: string;
  tecido_nome: string;
  quantidade: number;
  criado_em: string;
}
