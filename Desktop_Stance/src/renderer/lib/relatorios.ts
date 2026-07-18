import type { RelatorioPerdaLinha, RelatorioProducaoLinha } from "@shared/models";

export function listRelatorioProducao(): Promise<RelatorioProducaoLinha[]> {
  return window.zenith.relatorios.producaoListLocal();
}

export function listRelatorioPerdas(): Promise<RelatorioPerdaLinha[]> {
  return window.zenith.relatorios.perdasListLocal();
}
