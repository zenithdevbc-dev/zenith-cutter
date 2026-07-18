import type { RelatorioProducaoLinha, StatusOrdemCorte } from "@shared/models";
import { calcularTempoProducaoMinutos } from "@/lib/relatorioProducao";

export interface RelatorioOperadoresFiltros {
  dataInicio: string;
  dataFim: string;
  operadorId: string;
  status: StatusOrdemCorte | "todos";
}

export const FILTROS_OPERADORES_VAZIOS: RelatorioOperadoresFiltros = {
  dataInicio: "",
  dataFim: "",
  operadorId: "todos",
  status: "todos",
};

export interface OperadorOpcao {
  id: string;
  nome: string;
}

/**
 * Opções do filtro "Operador" vêm só de quem já operou de verdade
 * (aparece como iniciado_por em alguma sessão) — não da lista completa
 * de usuários cadastrados, que incluiria administrador/supervisor sem
 * nenhuma sessão. Mesmo espírito da nota do pedido: só dado de
 * produção já disponível no sistema.
 */
export function listarOperadoresDisponiveis(linhas: RelatorioProducaoLinha[]): OperadorOpcao[] {
  const porId = new Map<string, string>();
  for (const linha of linhas) {
    if (linha.operador_id && !porId.has(linha.operador_id)) {
      porId.set(linha.operador_id, linha.operador_nome ?? "—");
    }
  }
  return Array.from(porId.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/** Período filtra por data de criação da ordem — mesmo critério dos demais relatórios. */
export function filtrarRelatorioOperadores(
  linhas: RelatorioProducaoLinha[],
  filtros: RelatorioOperadoresFiltros,
): RelatorioProducaoLinha[] {
  return linhas.filter((linha) => {
    const data = linha.criado_em.slice(0, 10);
    if (filtros.dataInicio && data < filtros.dataInicio) return false;
    if (filtros.dataFim && data > filtros.dataFim) return false;
    if (filtros.operadorId !== "todos" && linha.operador_id !== filtros.operadorId) return false;
    if (filtros.status !== "todos" && linha.status !== filtros.status) return false;
    return true;
  });
}

const STATUS_EM_ANDAMENTO: StatusOrdemCorte[] = [
  "em_corte",
  "embalagem",
  "revisao",
  "despacho",
];

/**
 * Uma linha por operador, agregada a partir das ordens filtradas.
 * Ordens sem operador (nunca iniciadas) não entram em nenhum operador
 * — não existe "operador indefinido" nesta tabela. "Última atividade"
 * = início de sessão mais recente (não a conclusão — reflete quando o
 * operador atuou por último, mesmo que a ordem ainda esteja em
 * andamento).
 */
export interface OperadorAgregadoLinha {
  operador_id: string;
  operador: string;
  pecasConcluidas: number;
  pecasEmAndamento: number;
  tempoMedioMinutos: number | null;
  ultimaAtividade: string;
}

export function agruparPorOperador(linhas: RelatorioProducaoLinha[]): OperadorAgregadoLinha[] {
  const porOperador = new Map<string, RelatorioProducaoLinha[]>();
  for (const linha of linhas) {
    if (!linha.operador_id) continue;
    const lista = porOperador.get(linha.operador_id);
    if (lista) lista.push(linha);
    else porOperador.set(linha.operador_id, [linha]);
  }

  return Array.from(porOperador.entries())
    .map(([operador_id, ordens]) => {
      const pecasConcluidas = ordens
        .filter((o) => o.status === "pronto")
        .reduce((soma, o) => soma + o.quantidade_total, 0);
      const pecasEmAndamento = ordens
        .filter((o) => STATUS_EM_ANDAMENTO.includes(o.status))
        .reduce((soma, o) => soma + o.quantidade_total, 0);

      const temposConcluidos = ordens
        .filter((o) => o.iniciado_em && o.finalizado_em)
        .map((o) => calcularTempoProducaoMinutos(o))
        .filter((t): t is number => t !== null);
      const tempoMedioMinutos =
        temposConcluidos.length > 0
          ? Math.round(temposConcluidos.reduce((soma, v) => soma + v, 0) / temposConcluidos.length)
          : null;

      const ultimaAtividade = ordens.reduce(
        (max, o) => (o.iniciado_em && o.iniciado_em > max ? o.iniciado_em : max),
        ordens[0].iniciado_em ?? "",
      );

      return {
        operador_id,
        operador: ordens[0].operador_nome ?? "—",
        pecasConcluidas,
        pecasEmAndamento,
        tempoMedioMinutos,
        ultimaAtividade,
      };
    })
    .sort((a, b) => b.pecasConcluidas + b.pecasEmAndamento - (a.pecasConcluidas + a.pecasEmAndamento));
}

export interface RelatorioOperadoresKpis {
  totalOperadores: number;
  pecasConcluidas: number;
  tempoMedioMinutos: number | null;
  mediaPecasPorOperador: number;
}

/**
 * "Total Operators" = quem já operou alguma vez, em toda a base
 * (não filtrado) — mesmo espírito de "Total de Clientes" no Relatório
 * de Clientes (universo completo, independente do filtro atual).
 * "Tempo Médio de Produção" é calculado direto sobre as ordens
 * concluídas do período filtrado (não é média das médias por
 * operador, que enviesaria operadores com poucas ordens).
 */
export function calcularKpisRelatorioOperadores(
  todasLinhas: RelatorioProducaoLinha[],
  linhasFiltradas: RelatorioProducaoLinha[],
  agregado: OperadorAgregadoLinha[],
): RelatorioOperadoresKpis {
  const totalOperadores = new Set(
    todasLinhas.filter((l) => l.operador_id).map((l) => l.operador_id as string),
  ).size;

  const pecasConcluidas = linhasFiltradas
    .filter((l) => l.status === "pronto")
    .reduce((soma, l) => soma + l.quantidade_total, 0);

  const temposConcluidos = linhasFiltradas
    .filter((l) => l.iniciado_em && l.finalizado_em)
    .map((l) => calcularTempoProducaoMinutos(l))
    .filter((t): t is number => t !== null);
  const tempoMedioMinutos =
    temposConcluidos.length > 0
      ? Math.round(temposConcluidos.reduce((soma, v) => soma + v, 0) / temposConcluidos.length)
      : null;

  const totalPecasComOperador = agregado.reduce(
    (soma, l) => soma + l.pecasConcluidas + l.pecasEmAndamento,
    0,
  );
  const mediaPecasPorOperador =
    agregado.length > 0 ? Math.round((totalPecasComOperador / agregado.length) * 10) / 10 : 0;

  return { totalOperadores, pecasConcluidas, tempoMedioMinutos, mediaPecasPorOperador };
}

export interface PecasPorOperadorItem {
  operador: string;
  pecas: number;
}

/** Top operadores por peças (concluídas + em andamento) — gráfico "Peças por Operador". */
export function calcularPecasPorOperador(
  agregado: OperadorAgregadoLinha[],
  limite = 8,
): PecasPorOperadorItem[] {
  return agregado
    .slice(0, limite)
    .map((l) => ({ operador: l.operador, pecas: l.pecasConcluidas + l.pecasEmAndamento }));
}

export interface TempoProducaoOperadorItem {
  operador: string;
  minutos: number;
}

/** Comparação de tempo médio de produção entre operadores (só quem tem ordem concluída). */
export function calcularComparacaoTempoProducao(
  agregado: OperadorAgregadoLinha[],
  limite = 8,
): TempoProducaoOperadorItem[] {
  return agregado
    .filter((l): l is OperadorAgregadoLinha & { tempoMedioMinutos: number } =>
      l.tempoMedioMinutos !== null,
    )
    .sort((a, b) => b.tempoMedioMinutos - a.tempoMedioMinutos)
    .slice(0, limite)
    .map((l) => ({ operador: l.operador, minutos: l.tempoMedioMinutos }));
}

export interface ProdutividadeDiaItem {
  data: string;
  label: string;
  quantidade: number;
}

/**
 * Peças produzidas por dia no período filtrado (agregado entre todos
 * os operadores, só dias com conclusão) — alimenta "Produtividade
 * Diária".
 */
export function calcularProdutividadeDiaria(
  linhasFiltradas: RelatorioProducaoLinha[],
): ProdutividadeDiaItem[] {
  const porDia = new Map<string, number>();
  for (const linha of linhasFiltradas) {
    if (!linha.finalizado_em) continue;
    const dia = linha.finalizado_em.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + linha.quantidade_total);
  }
  return Array.from(porDia.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([data, quantidade]) => {
      const [, mes, dia] = data.split("-");
      return { data, label: `${dia}/${mes}`, quantidade };
    });
}
