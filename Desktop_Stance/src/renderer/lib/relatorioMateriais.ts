import type { OrdemCorteResumo, RelatorioPerdaLinha, Tecido } from "@shared/models";

export interface RelatorioMateriaisFiltros {
  dataInicio: string;
  dataFim: string;
  tecidoId: string;
  cor: string;
  clienteId: string;
}

export const FILTROS_MATERIAIS_VAZIOS: RelatorioMateriaisFiltros = {
  dataInicio: "",
  dataFim: "",
  tecidoId: "todos",
  cor: "todos",
  clienteId: "todos",
};

export function listarCoresDisponiveis(tecidos: Tecido[]): string[] {
  const cores = new Set<string>();
  for (const t of tecidos) {
    if (t.cor) cores.add(t.cor);
  }
  return Array.from(cores).sort((a, b) => a.localeCompare(b));
}

function dentroPeriodo(criadoEm: string, filtros: RelatorioMateriaisFiltros): boolean {
  const data = criadoEm.slice(0, 10);
  if (filtros.dataInicio && data < filtros.dataInicio) return false;
  if (filtros.dataFim && data > filtros.dataFim) return false;
  return true;
}

function corBate(
  tecidoId: string,
  tecidosPorId: Map<string, Tecido>,
  filtros: RelatorioMateriaisFiltros,
): boolean {
  if (filtros.cor === "todos") return true;
  return (tecidosPorId.get(tecidoId)?.cor ?? null) === filtros.cor;
}

export function filtrarOrdensRelatorioMateriais(
  ordens: OrdemCorteResumo[],
  tecidosPorId: Map<string, Tecido>,
  filtros: RelatorioMateriaisFiltros,
): OrdemCorteResumo[] {
  return ordens.filter((ordem) => {
    if (!dentroPeriodo(ordem.criado_em, filtros)) return false;
    if (filtros.tecidoId !== "todos" && ordem.tecido_id !== filtros.tecidoId) return false;
    if (filtros.clienteId !== "todos" && ordem.cliente_id !== filtros.clienteId) return false;
    return corBate(ordem.tecido_id, tecidosPorId, filtros);
  });
}

export function filtrarPerdasRelatorioMateriais(
  perdas: RelatorioPerdaLinha[],
  tecidosPorId: Map<string, Tecido>,
  filtros: RelatorioMateriaisFiltros,
): RelatorioPerdaLinha[] {
  return perdas.filter((perda) => {
    if (!dentroPeriodo(perda.criado_em, filtros)) return false;
    if (filtros.tecidoId !== "todos" && perda.tecido_id !== filtros.tecidoId) return false;
    if (filtros.clienteId !== "todos" && perda.cliente_id !== filtros.clienteId) return false;
    return corBate(perda.tecido_id, tecidosPorId, filtros);
  });
}

/**
 * Uma linha por material (tecido) — ordens/peças produzidas vêm das
 * ordens já filtradas, perdas registradas vêm de producao_perdas já
 * filtrada. Ordenado por peças produzidas (desc): índice 0 é o
 * "material mais usado".
 */
export interface MaterialAgregadoLinha {
  tecido_id: string;
  material: string;
  cor: string;
  ordens: number;
  pecasProduzidas: number;
  perdasRegistradas: number;
}

export function agruparPorMaterial(
  ordens: OrdemCorteResumo[],
  perdas: RelatorioPerdaLinha[],
  tecidosPorId: Map<string, Tecido>,
): MaterialAgregadoLinha[] {
  const porTecido = new Map<string, MaterialAgregadoLinha>();

  function linhaPara(tecidoId: string, nome: string): MaterialAgregadoLinha {
    let linha = porTecido.get(tecidoId);
    if (!linha) {
      linha = {
        tecido_id: tecidoId,
        material: nome,
        cor: tecidosPorId.get(tecidoId)?.cor ?? "—",
        ordens: 0,
        pecasProduzidas: 0,
        perdasRegistradas: 0,
      };
      porTecido.set(tecidoId, linha);
    }
    return linha;
  }

  for (const ordem of ordens) {
    const linha = linhaPara(ordem.tecido_id, ordem.tecido_nome);
    linha.ordens += 1;
    linha.pecasProduzidas += ordem.quantidade_total;
  }
  for (const perda of perdas) {
    const linha = linhaPara(perda.tecido_id, perda.tecido_nome);
    linha.perdasRegistradas += perda.quantidade;
  }

  return Array.from(porTecido.values()).sort((a, b) => b.pecasProduzidas - a.pecasProduzidas);
}

export interface RelatorioMateriaisKpis {
  totalOrdens: number;
  totalPecasProduzidas: number;
  totalPerdasRegistradas: number;
  materialMaisUsado: string | null;
}

/**
 * KPIs redefinidos com dado real do sistema (decisão de 2026-07-16):
 * o pedido original tinha "Chapas usadas"/"% de utilização"/
 * "desperdício estimado", conceitos de corte de chapa rígida (e de
 * controle de estoque) que não existem no domínio de corte de tecido
 * deste projeto — ver CLAUDE.md seção 7.
 */
export function calcularKpisRelatorioMateriais(
  linhas: MaterialAgregadoLinha[],
): RelatorioMateriaisKpis {
  return {
    totalOrdens: linhas.reduce((soma, l) => soma + l.ordens, 0),
    totalPecasProduzidas: linhas.reduce((soma, l) => soma + l.pecasProduzidas, 0),
    totalPerdasRegistradas: linhas.reduce((soma, l) => soma + l.perdasRegistradas, 0),
    materialMaisUsado: linhas.length > 0 ? linhas[0].material : null,
  };
}

export interface ConsumoMaterialItem {
  material: string;
  quantidade: number;
}

/** Top materiais por peças produzidas — gráfico "Consumo de Material". */
export function calcularConsumoPorMaterial(
  linhas: MaterialAgregadoLinha[],
  limite = 8,
): ConsumoMaterialItem[] {
  return linhas
    .filter((l) => l.pecasProduzidas > 0)
    .slice(0, limite)
    .map((l) => ({ material: l.material, quantidade: l.pecasProduzidas }));
}

export interface MaterialMaisUsadoItem {
  material: string;
  ordens: number;
}

/** Top materiais por número de ordens — gráfico "Materiais Mais Usados". */
export function calcularMateriaisMaisUsados(
  linhas: MaterialAgregadoLinha[],
  limite = 8,
): MaterialMaisUsadoItem[] {
  return [...linhas]
    .filter((l) => l.ordens > 0)
    .sort((a, b) => b.ordens - a.ordens)
    .slice(0, limite)
    .map((l) => ({ material: l.material, ordens: l.ordens }));
}

export interface TendenciaPerdaItem {
  data: string;
  label: string;
  quantidade: number;
}

/**
 * Perdas registradas por dia (só dias com registro — diferente do
 * gráfico "Últimos 30 Dias" do Dashboard, este cobre todo o período
 * filtrado, que pode ser maior ou não ter filtro nenhum). Substitui a
 * "Utilization Trend" do pedido original (não computável sem dado de
 * estoque) — ver CLAUDE.md seção 7.
 */
export function calcularTendenciaPerdas(perdas: RelatorioPerdaLinha[]): TendenciaPerdaItem[] {
  const porDia = new Map<string, number>();
  for (const perda of perdas) {
    const dia = perda.criado_em.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + perda.quantidade);
  }
  return Array.from(porDia.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([data, quantidade]) => {
      const [, mes, dia] = data.split("-");
      return { data, label: `${dia}/${mes}`, quantidade };
    });
}
