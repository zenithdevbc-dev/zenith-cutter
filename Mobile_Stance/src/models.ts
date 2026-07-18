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
