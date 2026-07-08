import {
  LayoutDashboard,
  ListOrdered,
  Scissors,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { PapelUsuario } from "@shared/models";

export type PageId =
  | "dashboard"
  | "fila-producao"
  | "ordens-corte"
  | "cadastros"
  | "configuracoes";

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  roles: PapelUsuario[];
}

/**
 * Operador só opera a produção no dia a dia — cadastros, clientes e
 * configurações são de responsabilidade do administrador. Ajuste aqui se
 * mais papéis/telas forem adicionados no futuro.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador"] },
  {
    id: "fila-producao",
    label: "Fila de Produção",
    icon: ListOrdered,
    roles: ["administrador", "operador"],
  },
  {
    id: "ordens-corte",
    label: "Ordens de Corte",
    icon: Scissors,
    roles: ["administrador", "operador"],
  },
  { id: "cadastros", label: "Cadastros", icon: Users, roles: ["administrador"] },
  { id: "configuracoes", label: "Configurações", icon: Settings, roles: ["administrador"] },
];

export function getAllowedNavItems(papel: PapelUsuario | undefined): NavItem[] {
  if (!papel) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(papel));
}
