import {
  LayoutDashboard,
  ListOrdered,
  Scissors,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

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
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "fila-producao", label: "Fila de Produção", icon: ListOrdered },
  { id: "ordens-corte", label: "Ordens de Corte", icon: Scissors },
  { id: "cadastros", label: "Cadastros", icon: Users },
  { id: "configuracoes", label: "Configurações", icon: Settings },
];
