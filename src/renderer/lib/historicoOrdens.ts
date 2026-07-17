import type {
  OrdemCorteResumo,
  RelatorioProducaoLinha,
  StatusOrdemCorte,
} from "@shared/models";

/**
 * Uma ordem completa (mesmos campos de OrdemCorteResumo, usados pelo
 * dialog de Info) + os dados de produção que só existem na sessão
 * (operador/início/conclusão). Uma ordem tem no máximo uma sessão na
 * prática — o fluxo nunca volta pra fila depois de iniciada.
 */
export interface OrdemHistoricoLinha extends OrdemCorteResumo {
  operador_id: string | null;
  operador_nome: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
}

/**
 * Junta a lista completa de ordens (fonte: listOrdensCorte, já usada
 * em Ordens de Corte — traz produto/observações/prazo/peças) com a
 * lista do Relatório de Produção (fonte dos dados de sessão) pelo id
 * da ordem. Nenhuma chamada IPC nova: ambas já são buscadas em outros
 * pontos do app.
 */
export function mesclarHistoricoOrdens(
  ordens: OrdemCorteResumo[],
  sessoes: RelatorioProducaoLinha[],
): OrdemHistoricoLinha[] {
  const sessaoPorOrdemId = new Map(sessoes.map((s) => [s.ordem_id, s]));
  return ordens.map((ordem) => {
    const sessao = sessaoPorOrdemId.get(ordem.id);
    return {
      ...ordem,
      operador_id: sessao?.operador_id ?? null,
      operador_nome: sessao?.operador_nome ?? null,
      iniciado_em: sessao?.iniciado_em ?? null,
      finalizado_em: sessao?.finalizado_em ?? null,
    };
  });
}

export interface HistoricoOrdensFiltros {
  numero: string;
  clienteId: string;
  tecidoId: string;
  status: StatusOrdemCorte | "todos";
  operadorId: string;
  dataInicio: string;
  dataFim: string;
}

export const FILTROS_HISTORICO_VAZIOS: HistoricoOrdensFiltros = {
  numero: "",
  clienteId: "todos",
  tecidoId: "todos",
  status: "todos",
  operadorId: "todos",
  dataInicio: "",
  dataFim: "",
};

/** Período filtra por data de criação da ordem (criado_em), mesmo critério do Relatório de Produção. */
export function filtrarHistoricoOrdens(
  linhas: OrdemHistoricoLinha[],
  filtros: HistoricoOrdensFiltros,
): OrdemHistoricoLinha[] {
  const numeroBusca = filtros.numero.trim();
  return linhas.filter((linha) => {
    if (numeroBusca && !String(linha.numero).includes(numeroBusca)) return false;
    if (filtros.clienteId !== "todos" && linha.cliente_id !== filtros.clienteId) return false;
    if (filtros.tecidoId !== "todos" && linha.tecido_id !== filtros.tecidoId) return false;
    if (filtros.status !== "todos" && linha.status !== filtros.status) return false;
    if (filtros.operadorId !== "todos" && linha.operador_id !== filtros.operadorId) return false;
    const dataCriacao = linha.criado_em.slice(0, 10);
    if (filtros.dataInicio && dataCriacao < filtros.dataInicio) return false;
    if (filtros.dataFim && dataCriacao > filtros.dataFim) return false;
    return true;
  });
}
