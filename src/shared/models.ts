export type PapelUsuario = "operador" | "administrador";

export interface Usuario {
  id: string;
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
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ClienteInput {
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
