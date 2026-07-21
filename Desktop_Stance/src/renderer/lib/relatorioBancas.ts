import type { Banca, RelatorioProducaoLinha } from "@shared/models";

export interface RelatorioBancasFiltros {
  dataInicio: string;
  dataFim: string;
  bancaId: string;
  status: "todas" | "ativas" | "inativas";
}

export const FILTROS_BANCAS_VAZIOS: RelatorioBancasFiltros = {
  dataInicio: "",
  dataFim: "",
  bancaId: "todas",
  status: "todas",
};

/** Período filtra por data de criação da ordem — mesmo critério dos demais relatórios. */
export function filtrarRelatorioBancas(
  linhas: RelatorioProducaoLinha[],
  filtros: RelatorioBancasFiltros,
): RelatorioProducaoLinha[] {
  return linhas.filter((linha) => {
    const data = linha.criado_em.slice(0, 10);
    if (filtros.dataInicio && data < filtros.dataInicio) return false;
    if (filtros.dataFim && data > filtros.dataFim) return false;
    if (filtros.bancaId !== "todas" && linha.banca_id !== filtros.bancaId) return false;
    return true;
  });
}

export interface BancaAgregadaLinha {
  banca_id: string;
  banca: string;
  ativo: boolean;
  pecas: number;
  ultimaAtividade: string | null;
}

/**
 * Uma linha por banca CADASTRADA (diferente de `agruparPorCliente`, que
 * só lista quem tem pelo menos uma ordem) — o pedido é literal "Bancas
 * cadastradas": uma banca nova, sem nenhuma ordem ainda, também deve
 * aparecer (com peças = 0, última atividade vazia). `bancasCadastro` já
 * vem filtrada por status (ativas/inativas) de quem chama.
 */
export function agruparPorBanca(
  linhas: RelatorioProducaoLinha[],
  bancasCadastro: Banca[],
): BancaAgregadaLinha[] {
  const porBanca = new Map<string, RelatorioProducaoLinha[]>();
  for (const linha of linhas) {
    if (!linha.banca_id) continue;
    const lista = porBanca.get(linha.banca_id);
    if (lista) lista.push(linha);
    else porBanca.set(linha.banca_id, [linha]);
  }

  return bancasCadastro
    .map((banca) => {
      const ordens = porBanca.get(banca.id) ?? [];
      const pecas = ordens.reduce((soma, o) => soma + o.quantidade_total, 0);
      const ultimaAtividade =
        ordens.length > 0
          ? ordens.reduce((max, o) => (o.criado_em > max ? o.criado_em : max), ordens[0].criado_em)
          : null;
      return {
        banca_id: banca.id,
        banca: banca.nome,
        ativo: banca.ativo,
        pecas,
        ultimaAtividade,
      };
    })
    .sort((a, b) => b.pecas - a.pecas);
}

export interface RelatorioBancasKpis {
  totalBancas: number;
  bancasAtivas: number;
  pecasProduzidas: number;
  mediaPecasPorBanca: number;
}

/** "Bancas Ativas" = flag de cadastro (`Banca.ativo`), mesma definição do card do Dashboard. */
export function calcularKpisRelatorioBancas(
  todasBancas: Banca[],
  agregado: BancaAgregadaLinha[],
): RelatorioBancasKpis {
  const totalBancas = todasBancas.length;
  const bancasAtivas = todasBancas.filter((b) => b.ativo).length;
  const pecasProduzidas = agregado.reduce((soma, l) => soma + l.pecas, 0);
  const mediaPecasPorBanca =
    bancasAtivas > 0 ? Math.round((pecasProduzidas / bancasAtivas) * 10) / 10 : 0;
  return { totalBancas, bancasAtivas, pecasProduzidas, mediaPecasPorBanca };
}

export interface PecasPorBancaItem {
  banca: string;
  pecas: number;
}

/** Top bancas por peças produzidas — gráfico "Peças por Banca". Bancas sem peças não entram (fatia/barra vazia não ajuda). */
export function calcularPecasPorBanca(
  agregado: BancaAgregadaLinha[],
  limite = 8,
): PecasPorBancaItem[] {
  return agregado
    .filter((l) => l.pecas > 0)
    .slice(0, limite)
    .map((l) => ({ banca: l.banca, pecas: l.pecas }));
}

export interface AtividadeBancasItem {
  data: string;
  label: string;
  quantidade: number;
}

/**
 * Peças encomendadas de bancas por dia no período filtrado (só dias com
 * ordem, agregado — não por banca individual, mesmo espírito de
 * `calcularAtividadeClientesPorDia`).
 */
export function calcularAtividadeBancasPorDia(
  linhas: RelatorioProducaoLinha[],
): AtividadeBancasItem[] {
  const porDia = new Map<string, number>();
  for (const linha of linhas) {
    if (!linha.banca_id) continue;
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
