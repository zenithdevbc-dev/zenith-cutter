export interface Empresa {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export type PapelUsuario = "operador" | "supervisor" | "administrador";

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

export interface UsuarioUpdatePatch {
  nome?: string;
  login?: string;
  papel?: PapelUsuario;
  ativo?: boolean;
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

export type StatusOrdemCorte = "aberta" | "em_fila" | "cancelada";

export interface OrdemCorte {
  id: string;
  empresa_id: string;
  cliente_id: string;
  produto_id: string;
  tecido_id: string;
  status: StatusOrdemCorte;
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Linha da lista já com nomes resolvidos (join feito no repositório) —
 * evita N+1 lookups no renderer só para exibir a tabela.
 */
export interface OrdemCorteResumo extends OrdemCorte {
  cliente_nome: string;
  produto_nome: string;
  tecido_nome: string;
  quantidade_total: number;
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
  cliente_id: string;
  produto_id: string;
  tecido_id: string;
  observacoes?: string | null;
  itens: OrdemCorteItemInput[];
}

export interface OrdemCorteUpdatePatch {
  cliente_id?: string;
  produto_id?: string;
  tecido_id?: string;
  observacoes?: string | null;
  status?: StatusOrdemCorte;
  itens?: OrdemCorteItemInput[];
}

export type AcaoOrdemCorteHistorico =
  | "criacao"
  | "edicao"
  | "mudanca_status"
  | "cancelamento"
  | "duplicacao";

/**
 * Auditoria da ordem (ver CLAUDE.md 3.5): quem fez o quê e quando.
 * usuario_nome é resolvido no repositório (join com usuarios) — evita
 * o renderer precisar de outra consulta só para exibir "quem fez".
 */
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
