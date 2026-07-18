import type { Cliente, RelatorioProducaoLinha } from "@shared/models";
import { calcularTempoProducaoMinutos } from "@/lib/relatorioProducao";

export interface RelatorioClientesFiltros {
  dataInicio: string;
  dataFim: string;
  clienteId: string;
  tecidoId: string;
}

export const FILTROS_CLIENTES_VAZIOS: RelatorioClientesFiltros = {
  dataInicio: "",
  dataFim: "",
  clienteId: "todos",
  tecidoId: "todos",
};

/** Período filtra por data de criação da ordem — mesmo critério dos demais relatórios. */
export function filtrarRelatorioClientes(
  linhas: RelatorioProducaoLinha[],
  filtros: RelatorioClientesFiltros,
): RelatorioProducaoLinha[] {
  return linhas.filter((linha) => {
    const data = linha.criado_em.slice(0, 10);
    if (filtros.dataInicio && data < filtros.dataInicio) return false;
    if (filtros.dataFim && data > filtros.dataFim) return false;
    if (filtros.clienteId !== "todos" && linha.cliente_id !== filtros.clienteId) return false;
    if (filtros.tecidoId !== "todos" && linha.tecido_id !== filtros.tecidoId) return false;
    return true;
  });
}

/**
 * Uma linha por cliente, agregada a partir das ordens filtradas.
 * "Materiais usados" é a lista de tecidos distintos das ordens desse
 * cliente no período. "Tempo médio de produção" só considera ordens
 * com sessão finalizada (mesmo critério do Relatório de Produção) —
 * ordem em andamento não entra na média.
 */
export interface ClienteAgregadoLinha {
  cliente_id: string;
  cliente: string;
  pecas: number;
  ultimaOrdem: string;
  materiaisUsados: string[];
  tempoMedioMinutos: number | null;
}

export function agruparPorCliente(linhas: RelatorioProducaoLinha[]): ClienteAgregadoLinha[] {
  const porCliente = new Map<string, RelatorioProducaoLinha[]>();
  for (const linha of linhas) {
    const lista = porCliente.get(linha.cliente_id);
    if (lista) lista.push(linha);
    else porCliente.set(linha.cliente_id, [linha]);
  }

  return Array.from(porCliente.entries())
    .map(([cliente_id, ordens]) => {
      const materiaisUsados = Array.from(new Set(ordens.map((o) => o.tecido_nome))).sort((a, b) =>
        a.localeCompare(b),
      );
      const ultimaOrdem = ordens.reduce(
        (max, o) => (o.criado_em > max ? o.criado_em : max),
        ordens[0].criado_em,
      );
      const temposConcluidos = ordens
        .filter((o) => o.iniciado_em && o.finalizado_em)
        .map((o) => calcularTempoProducaoMinutos(o))
        .filter((t): t is number => t !== null);
      const tempoMedioMinutos =
        temposConcluidos.length > 0
          ? Math.round(temposConcluidos.reduce((soma, v) => soma + v, 0) / temposConcluidos.length)
          : null;

      return {
        cliente_id,
        cliente: ordens[0].cliente_nome,
        pecas: ordens.reduce((soma, o) => soma + o.quantidade_total, 0),
        ultimaOrdem,
        materiaisUsados,
        tempoMedioMinutos,
      };
    })
    .sort((a, b) => b.pecas - a.pecas);
}

export function formatarMateriaisUsados(materiais: string[], limite = 3): string {
  if (materiais.length === 0) return "—";
  if (materiais.length <= limite) return materiais.join(", ");
  return `${materiais.slice(0, limite).join(", ")} +${materiais.length - limite}`;
}

export interface RelatorioClientesKpis {
  totalClientes: number;
  clientesAtivos: number;
  pecasProduzidas: number;
  mediaPecasPorCliente: number;
}

/**
 * "Clientes ativos" aqui = clientes com pelo menos 1 ordem no período
 * filtrado (atividade real) — não confundir com `Cliente.ativo`, que é
 * só a flag de soft-delete do cadastro (não medida de atividade).
 */
export function calcularKpisRelatorioClientes(
  todosClientes: Cliente[],
  agregado: ClienteAgregadoLinha[],
): RelatorioClientesKpis {
  const totalClientes = todosClientes.length;
  const clientesAtivos = agregado.length;
  const pecasProduzidas = agregado.reduce((soma, l) => soma + l.pecas, 0);
  const mediaPecasPorCliente =
    clientesAtivos > 0 ? Math.round((pecasProduzidas / clientesAtivos) * 10) / 10 : 0;
  return { totalClientes, clientesAtivos, pecasProduzidas, mediaPecasPorCliente };
}

export interface PecasPorClienteItem {
  cliente: string;
  pecas: number;
}

/** Top clientes por peças produzidas — gráfico "Peças por Cliente". */
export function calcularPecasPorCliente(
  agregado: ClienteAgregadoLinha[],
  limite = 8,
): PecasPorClienteItem[] {
  return agregado.slice(0, limite).map((l) => ({ cliente: l.cliente, pecas: l.pecas }));
}

export interface AtividadeClientesItem {
  data: string;
  label: string;
  quantidade: number;
}

/**
 * Peças encomendadas por dia no período filtrado (só dias com ordem,
 * agregado — não é por cliente individual, pra não exigir paleta
 * categórica de N cores). Alimenta "Atividade de Clientes ao Longo do
 * Tempo".
 */
export function calcularAtividadeClientesPorDia(
  linhas: RelatorioProducaoLinha[],
): AtividadeClientesItem[] {
  const porDia = new Map<string, number>();
  for (const linha of linhas) {
    const dia = linha.criado_em.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + linha.quantidade_total);
  }
  return Array.from(porDia.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([data, quantidade]) => {
      const [, mes, dia] = data.split("-");
      return { data, label: `${dia}/${mes}`, quantidade };
    });
}

