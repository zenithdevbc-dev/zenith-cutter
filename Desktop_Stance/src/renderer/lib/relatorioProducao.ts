import type { RelatorioProducaoLinha, StatusOrdemCorte } from "@shared/models";

export interface RelatorioProducaoFiltros {
  dataInicio: string;
  dataFim: string;
  clienteId: string;
  operadorId: string;
  tecidoId: string;
  status: StatusOrdemCorte | "todos";
}

export const FILTROS_RELATORIO_VAZIOS: RelatorioProducaoFiltros = {
  dataInicio: "",
  dataFim: "",
  clienteId: "todos",
  operadorId: "todos",
  tecidoId: "todos",
  status: "todos",
};

/**
 * Período filtra por data de criação da ordem (criado_em) — é o único
 * campo de data presente em toda ordem, independente de ela já ter
 * iniciado produção ou não.
 */
export function filtrarRelatorioProducao(
  linhas: RelatorioProducaoLinha[],
  filtros: RelatorioProducaoFiltros,
): RelatorioProducaoLinha[] {
  return linhas.filter((linha) => {
    const dataCriacao = linha.criado_em.slice(0, 10);
    if (filtros.dataInicio && dataCriacao < filtros.dataInicio) return false;
    if (filtros.dataFim && dataCriacao > filtros.dataFim) return false;
    if (filtros.clienteId !== "todos" && linha.cliente_id !== filtros.clienteId) return false;
    if (filtros.operadorId !== "todos" && linha.operador_id !== filtros.operadorId) return false;
    if (filtros.tecidoId !== "todos" && linha.tecido_id !== filtros.tecidoId) return false;
    if (filtros.status !== "todos" && linha.status !== filtros.status) return false;
    return true;
  });
}

export const STATUS_EM_ANDAMENTO: StatusOrdemCorte[] = [
  "enfesto",
  "corte",
  "embalagem",
  "despacho",
];

/**
 * Atrasada = tem prazo definido, o prazo já passou, e a ordem ainda
 * não terminou (não é 'pronto' nem 'cancelada'). Decisão de
 * 2026-07-16 — ver CLAUDE.md.
 */
export function isOrdemAtrasada(linha: RelatorioProducaoLinha, hojeISO: string): boolean {
  if (!linha.prazo) return false;
  if (linha.status === "pronto" || linha.status === "cancelada") return false;
  return linha.prazo < hojeISO;
}

/**
 * Tempo efetivo de produção em minutos: do início até a conclusão (ou
 * até agora, se ainda em andamento), descontando o tempo pausado
 * acumulado. Retorna null se a ordem nunca começou a ser produzida
 * (sem sessão).
 */
export function calcularTempoProducaoMinutos(linha: RelatorioProducaoLinha): number | null {
  if (!linha.iniciado_em) return null;
  const inicio = new Date(linha.iniciado_em).getTime();
  const fim = linha.finalizado_em ? new Date(linha.finalizado_em).getTime() : Date.now();
  const efetivoMs = Math.max(0, fim - inicio - linha.tempo_pausado_segundos * 1000);
  return Math.floor(efetivoMs / 60000);
}

export function formatarDuracaoMinutos(minutos: number | null): string {
  if (minutos === null) return "—";
  const horas = Math.floor(minutos / 60);
  const min = minutos % 60;
  return horas > 0 ? `${horas}h${String(min).padStart(2, "0")}min` : `${min}min`;
}

export interface RelatorioProducaoKpis {
  totalPecas: number;
  pecasConcluidas: number;
  pecasEmAndamento: number;
  /** Continua contando ordens, não peças — é sobre ordem com problema (prazo vencido), não volume produzido. */
  atrasadas: number;
  tempoMedioMinutos: number | null;
}

export function calcularKpisRelatorioProducao(
  linhas: RelatorioProducaoLinha[],
): RelatorioProducaoKpis {
  const hojeISO = new Date().toISOString().slice(0, 10);
  let totalPecas = 0;
  let pecasConcluidas = 0;
  let pecasEmAndamento = 0;
  let atrasadas = 0;
  const temposConcluidos: number[] = [];

  for (const linha of linhas) {
    totalPecas += linha.quantidade_total;
    if (linha.status === "pronto") pecasConcluidas += linha.quantidade_total;
    if (STATUS_EM_ANDAMENTO.includes(linha.status)) pecasEmAndamento += linha.quantidade_total;
    if (isOrdemAtrasada(linha, hojeISO)) atrasadas += 1;
    if (linha.iniciado_em && linha.finalizado_em) {
      const minutos = calcularTempoProducaoMinutos(linha);
      if (minutos !== null) temposConcluidos.push(minutos);
    }
  }

  const tempoMedioMinutos =
    temposConcluidos.length > 0
      ? Math.round(temposConcluidos.reduce((soma, v) => soma + v, 0) / temposConcluidos.length)
      : null;

  return {
    totalPecas,
    pecasConcluidas,
    pecasEmAndamento,
    atrasadas,
    tempoMedioMinutos,
  };
}
