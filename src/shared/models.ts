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
