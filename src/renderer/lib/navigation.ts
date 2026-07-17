import {
  LayoutDashboard,
  Scissors,
  Users,
  Settings,
  PlayCircle,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { PapelUsuario } from "@shared/models";

export type PageId =
  | "dashboard"
  | "ordens-corte"
  | "producao"
  | "cadastros"
  | "relatorios"
  | "configuracoes";

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
  roles: PapelUsuario[];
}

/**
 * Matriz de permissões (decisão de 2026-07-09, ajustada em
 * 2026-07-14 — página "Fila de Produção" removida por ser redundante
 * com "Produção", que já mostrava a mesma fila):
 * - Administrador: acesso total.
 * - Supervisor: tudo que é operacional (Dashboard, Ordens de Corte,
 *   Produção, Cadastros) — SEM Usuários nem Configurações. O tab
 *   "Usuários" dentro de Cadastros é ocultado à parte (ver
 *   CadastrosPage.tsx), já que aqui só controlamos a página inteira,
 *   não abas internas.
 * - Operador: só Dashboard + Produção (as ações de execução em si —
 *   iniciar/avançar etapa/pausar/retomar/finalizar/perdas/
 *   observações). Sem acesso a Ordens de Corte ou Cadastros. Dentro de
 *   Produção, a reordenação de prioridade da fila continua exclusiva
 *   de administrador/supervisor (gate por papel no próprio
 *   componente, ver ProducaoPage.tsx — não há mais rota separada pra
 *   isso).
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
    id: "producao",
    label: "Produção",
    icon: PlayCircle,
    roles: ["administrador", "supervisor", "operador"],
  },
  { id: "cadastros", label: "Cadastros", icon: Users, roles: ["administrador", "supervisor"] },
  {
    id: "relatorios",
    label: "Relatórios",
    icon: BarChart3,
    roles: ["administrador", "supervisor"],
  },
  { id: "configuracoes", label: "Configurações", icon: Settings, roles: ["administrador"] },
];

export function getAllowedNavItems(papel: PapelUsuario | undefined): NavItem[] {
  if (!papel) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(papel));
}
