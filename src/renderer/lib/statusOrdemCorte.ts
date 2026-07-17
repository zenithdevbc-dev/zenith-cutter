import type { StatusOrdemCorte } from "@shared/models";
import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export const STATUS_ORDEM_CORTE_LABEL: Record<StatusOrdemCorte, string> = {
  aberta: "Aberta",
  em_fila: "Em Fila",
  cancelada: "Cancelada",
  em_corte: "Em Corte",
  embalagem: "Embalagem",
  revisao: "Revisão",
  despacho: "Despacho",
  pronto: "Pronto",
};

/**
 * Cores semânticas de status (identidade visual, 2026-07-16): etapas
 * em execução usam "production" (azul), "pronto" usa "completed"
 * (verde), fila/rascunho usam "pending" (âmbar), cancelada usa
 * "delayed" (vermelho).
 */
export const STATUS_ORDEM_CORTE_VARIANT: Record<StatusOrdemCorte, BadgeVariant> = {
  aberta: "pending",
  em_fila: "pending",
  cancelada: "delayed",
  em_corte: "production",
  embalagem: "production",
  revisao: "production",
  despacho: "production",
  pronto: "completed",
};
