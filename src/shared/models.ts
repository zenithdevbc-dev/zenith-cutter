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

export type StatusOrdemCorte =
  | "aberta"
  | "em_fila"
  | "cancelada"
  | "em_corte"
  | "embalagem"
  | "revisao"
  | "despacho"
  | "pronto";

/**
 * Sequência pós-fila (seção 4 do CLAUDE.md, decisão de 2026-07-11):
 * cada etapa avança manualmente pra próxima, uma de cada vez, nunca
 * pulando (regra 4). 'aberta'/'em_fila'/'cancelada' ficam fora — não
 * fazem parte deste pipeline de execução.
 */
export const PIPELINE_PRODUCAO: readonly StatusOrdemCorte[] = [
  "em_corte",
  "embalagem",
  "revisao",
  "despacho",
  "pronto",
];

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
  /**
   * Mesa pré-atribuída na fila (decisão de 2026-07-16) — só faz
   * sentido enquanto status === 'em_fila'; permite montar uma fila
   * específica por mesa, vista no menu da mesa. Nullable: ordem pode
   * ficar sem mesa atribuída e ser iniciada em qualquer mesa livre,
   * como já funcionava antes.
   */
  mesa_atribuida_id: string | null;
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
  mesa_atribuida_nome: string | null;
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
  | "duplicacao"
  | "pausa"
  | "retomada";

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

/**
 * Mesa "livre"/"ocupada" nunca é uma coluna própria — é derivada de
 * existir (ou não) uma sessão de produção ativa apontando pra ela (ver
 * migration create_mesas_corte). Este tipo é o resultado já calculado
 * pelo repositório, pra exibir na Fila de Produção e em Produção.
 */
export interface MesaCorteComStatus extends MesaCorte {
  ocupada: boolean;
  sessao_id: string | null;
  ordem_numero: number | null;
}

export type StatusSessaoProducao = "em_andamento" | "pausada" | "finalizada";

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
  criado_em: string;
  atualizado_em: string;
}

/**
 * Linha já com nomes resolvidos (join no repositório), pra exibir a
 * lista "Em andamento" na página Produção sem N+1 lookups no renderer.
 */
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

/**
 * Perda de material registrada durante uma sessão de produção
 * (Sprint 4), por tamanho da grade do produto — mesmo formato de grid
 * usado na criação de ordem (decisão de 2026-07-16). tamanho é
 * resolvido via join com produto_tamanhos na leitura (não
 * desnormalizado, mesmo padrão de OrdemCorteItem). produto_tamanho_id
 * é nullable só pra não quebrar registros gravados antes desta
 * mudança (formato antigo, valor livre sem tamanho).
 */
export interface ProducaoPerda {
  id: string;
  empresa_id: string;
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

/**
 * Observação registrada durante uma sessão de produção (Sprint 4) —
 * log cronológico, diferente do campo estático `ordens_corte.observacoes`.
 */
export interface ProducaoObservacao {
  id: string;
  empresa_id: string;
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
