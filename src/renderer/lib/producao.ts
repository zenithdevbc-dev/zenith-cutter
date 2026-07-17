import type {
  IniciarProducaoInput,
  MesaCorteComStatus,
  OrdemCorte,
  ProducaoObservacao,
  ProducaoObservacaoInput,
  ProducaoPerda,
  ProducaoPerdaInput,
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

/**
 * Avança a ordem uma etapa do pipeline pós-fila (em_corte→embalagem→
 * revisao→despacho→pronto), nunca pulando etapa.
 */
export function avancarEtapaOrdem(ordemId: string, usuarioId: string): Promise<OrdemCorte> {
  return window.zenith.producao.avancarEtapaLocal(ordemId, usuarioId);
}

export function pausarProducao(ordemId: string, usuarioId: string): Promise<SessaoProducao> {
  return window.zenith.producao.pausarLocal(ordemId, usuarioId);
}

export function retomarProducao(ordemId: string, usuarioId: string): Promise<SessaoProducao> {
  return window.zenith.producao.retomarLocal(ordemId, usuarioId);
}

export function listProducaoPerdas(sessaoId: string): Promise<ProducaoPerda[]> {
  return window.zenith.producao.perdasListLocal(sessaoId);
}

export function listProducaoPerdasPorOrdem(ordemId: string): Promise<ProducaoPerda[]> {
  return window.zenith.producao.perdasListPorOrdemLocal(ordemId);
}

export function registrarProducaoPerda(
  input: ProducaoPerdaInput,
  usuarioId: string,
): Promise<ProducaoPerda> {
  return window.zenith.producao.perdasRegistrarLocal(input, usuarioId);
}

export function listProducaoObservacoes(sessaoId: string): Promise<ProducaoObservacao[]> {
  return window.zenith.producao.observacoesListLocal(sessaoId);
}

export function registrarProducaoObservacao(
  input: ProducaoObservacaoInput,
  usuarioId: string,
): Promise<ProducaoObservacao> {
  return window.zenith.producao.observacoesRegistrarLocal(input, usuarioId);
}
