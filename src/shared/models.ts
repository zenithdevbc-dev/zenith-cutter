export interface Empresa {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export type PapelUsuario = "operador" | "administrador";

export interface Usuario {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface UsuarioUpdatePatch {
  nome?: string;
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
