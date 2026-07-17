import type { RelatorioProducaoLinha } from "@shared/models";

export function listRelatorioProducao(): Promise<RelatorioProducaoLinha[]> {
  return window.zenith.relatorios.producaoListLocal();
}
