import type { PapelUsuario } from './models';

/**
 * Espelha `Desktop_Stance/src/renderer/lib/navigation.ts` — mesma matriz
 * de papéis (CLAUDE.md §3.6), sem tela de Usuários/Configurações no
 * mobile (fora do escopo desta expansão). Aplicado só na navegação (esta
 * tela some da barra de abas pra quem não deveria ver) — a barreira real
 * continua sendo o RLS do Supabase, mesmo princípio de defesa em
 * profundidade do desktop.
 */
export type PageId =
  | 'dashboard'
  | 'ordens-corte'
  | 'producao'
  | 'cadastros'
  | 'bancas'
  | 'relatorios';

export interface NavItem {
  id: PageId;
  label: string;
  roles: PapelUsuario[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', roles: ['administrador', 'supervisor', 'operador'] },
  { id: 'ordens-corte', label: 'Ordens', roles: ['administrador', 'supervisor'] },
  { id: 'producao', label: 'Produção', roles: ['administrador', 'supervisor', 'operador'] },
  { id: 'cadastros', label: 'Cadastros', roles: ['administrador', 'supervisor'] },
  { id: 'bancas', label: 'Terceiros', roles: ['administrador', 'supervisor'] },
  { id: 'relatorios', label: 'Relatórios', roles: ['administrador', 'supervisor'] },
];

export function getAllowedNavItems(papel: PapelUsuario | undefined): NavItem[] {
  if (!papel) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(papel));
}
