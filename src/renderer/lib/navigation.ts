import {
  LayoutDashboard,
  ListOrdered,
  Scissors,
  Users,
  Settings,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import type { PapelUsuario } from "@shared/models";

export type PageId =
  | "dashboard"
  | "ordens-corte"
  | "fila-producao"
  | "producao"
  | "cadastros"
  | "configuracoes";

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  roles: PapelUsuario[];
}

/**
 * Matriz de permissões (decisão de 2026-07-09):
 * - Administrador: acesso total.
 * - Supervisor: tudo que é operacional (Dashboard, Ordens de Corte,
 *   Fila de Produção, Produção, Cadastros) — SEM Usuários nem
 *   Configurações. O tab "Usuários" dentro de Cadastros é ocultado à
 *   parte (ver CadastrosPage.tsx), já que aqui só controlamos a página
 *   inteira, não abas internas.
 * - Operador: só Dashboard + Produção (as ações de execução em si —
 *   iniciar/pausar/retomar/finalizar/perdas/observações). Sem acesso a
 *   Ordens de Corte, Fila de Produção ou Cadastros.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["administrador", "supervisor", "operador"],
  },
  {
    id: "ordens-corte",
    label: "Ordens de Corte",
    icon: Scissors,
    roles: ["administrador", "supervisor"],
  },
  {
    id: "fila-producao",
    label: "Fila de Produção",
    icon: ListOrdered,
    roles: ["administrador", "supervisor"],
  },
  {
    id: "producao",
    label: "Produção",
    icon: PlayCircle,
    roles: ["administrador", "supervisor", "operador"],
  },
  { id: "cadastros", label: "Cadastros", icon: Users, roles: ["administrador", "supervisor"] },
  { id: "configuracoes", label: "Configurações", icon: Settings, roles: ["administrador"] },
];

export function getAllowedNavItems(papel: PapelUsuario | undefined): NavItem[] {
  if (!papel) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(papel));
}
