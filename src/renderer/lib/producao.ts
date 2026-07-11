import type {
  IniciarProducaoInput,
  MesaCorteComStatus,
  SessaoProducao,
  SessaoProducaoResumo,
} from "@shared/models";

/**
 * Execução da produção: seleção de mesa livre + confirmação de início
 * (Sprint 3). Pausar/retomar/finalizar/perdas/observações chegam no
 * Sprint 4.
 */
export function listMesasComStatus(): Promise<MesaCorteComStatus[]> {
  return window.zenith.producao.listMesasLocal();
}

export function iniciarProducao(
  input: IniciarProducaoInput,
  usuarioId: string,
): Promise<SessaoProducao> {
  return window.zenith.producao.iniciarLocal(input, usuarioId);
}

export function listSessoesAtivas(): Promise<SessaoProducaoResumo[]> {
  return window.zenith.producao.listSessoesAtivasLocal();
}
