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
}

/** "Ocupada" é derivada de existir sessão ativa (em_andamento/pausada) — nunca uma coluna própria. */
export interface MesaCorteComStatus extends MesaCorte {
  ocupada: boolean;
  sessao_id: string | null;
  ordem_numero: number | null;
}

export type StatusOrdemCorte =
  | 'aberta'
  | 'em_fila'
  | 'cancelada'
  | 'em_corte'
  | 'embalagem'
  | 'revisao'
  | 'despacho'
  | 'pronto';

/** Sequência pós-fila (CLAUDE.md §4): cada etapa avança manualmente, uma de cada vez. */
export const PIPELINE_PRODUCAO: readonly StatusOrdemCorte[] = [
  'em_corte',
  'embalagem',
  'revisao',
  'despacho',
  'pronto',
];

export const STATUS_ORDEM_CORTE_LABEL: Record<StatusOrdemCorte, string> = {
  aberta: 'Aberta',
  em_fila: 'Em Fila',
  cancelada: 'Cancelada',
  em_corte: 'Em Corte',
  embalagem: 'Embalagem',
  revisao: 'Revisão',
  despacho: 'Despacho',
  pronto: 'Pronto',
};

/** Linha da fila/pipeline já com nomes resolvidos (join), evita N+1 lookups na tela. */
export interface OrdemCorteResumo {
  id: string;
  empresa_id: string;
  numero: number;
  cliente_id: string;
  cliente_nome: string;
  produto_id: string;
  produto_nome: string;
  tecido_id: string;
  tecido_nome: string;
  status: StatusOrdemCorte;
  observacoes: string | null;
  mesa_atribuida_id: string | null;
  mesa_atribuida_nome: string | null;
  quantidade_total: number;
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
  produto_id: string;
  tamanho: string;
  ordem: number;
  ativo: boolean;
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
