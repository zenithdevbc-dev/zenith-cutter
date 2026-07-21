import type { Banca, OrdemCorteResumo, RelatorioProducaoLinha, StatusOrdemCorte } from "@shared/models";
import { STATUS_ORDEM_CORTE_LABEL } from "@/lib/statusOrdemCorte";
import { STATUS_EM_ANDAMENTO } from "@/lib/relatorioProducao";

/**
 * Cores por status pro gráfico de rosca — distintas o bastante pra
 * diferenciar as 8 fatias (as cores semânticas de badge.tsx reusam a
 * mesma cor pra vários status do pipeline, o que funciona num badge
 * isolado mas confundiria fatias vizinhas num gráfico). Mantém a
 * mesma família de cor da marca (--primary/--status-*, index.css)
 * onde faz sentido: pending=âmbar, production=azul, completed=verde,
 * delayed=vermelho.
 */
const STATUS_COR_GRAFICO: Record<StatusOrdemCorte, string> = {
  aberta: "#94A3B8",
  em_fila: "#F59E0B",
  em_corte: "#2563EB",
  embalagem: "#6366F1",
  revisao: "#8B5CF6",
  despacho: "#0EA5E9",
  pronto: "#16A34A",
  cancelada: "#DC2626",
};

export interface DistribuicaoStatusItem {
  status: StatusOrdemCorte;
  nome: string;
  quantidade: number;
  cor: string;
}

/**
 * Peças (não ordens) por status — pedido do usuário: volume de
 * produção conta mais que número de ordens numa fatia. Só entram
 * status com pelo menos 1 peça — fatia vazia não faz sentido num
 * gráfico.
 */
export function calcularDistribuicaoStatus(
  ordens: OrdemCorteResumo[],
): DistribuicaoStatusItem[] {
  const contagem = new Map<StatusOrdemCorte, number>();
  for (const ordem of ordens) {
    contagem.set(ordem.status, (contagem.get(ordem.status) ?? 0) + ordem.quantidade_total);
  }
  return Array.from(contagem.entries())
    .map(([status, quantidade]) => ({
      status,
      nome: STATUS_ORDEM_CORTE_LABEL[status],
      quantidade,
      cor: STATUS_COR_GRAFICO[status],
    }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export interface ProducaoDiaItem {
  data: string;
  label: string;
  quantidade: number;
}

/**
 * Série dos últimos 30 dias (hoje incluso) — quantidade de peças
 * produzidas (ordens com sessão finalizada) em cada dia. Dia sem
 * conclusão aparece com 0 (não é omitido), pra manter o eixo do tempo
 * contínuo. Mesmo critério de data usado no resto do relatório:
 * recorte por `slice(0, 10)` do ISO, sem conversão de fuso.
 */
export function calcularProducaoUltimos30Dias(
  linhas: RelatorioProducaoLinha[],
): ProducaoDiaItem[] {
  const contagem = new Map<string, number>();
  for (const linha of linhas) {
    if (!linha.finalizado_em) continue;
    const dia = linha.finalizado_em.slice(0, 10);
    contagem.set(dia, (contagem.get(dia) ?? 0) + linha.quantidade_total);
  }

  const dias: ProducaoDiaItem[] = [];
  const hoje = new Date();
  for (let i = 29; i >= 0; i--) {
    const data = new Date(hoje);
    data.setDate(data.getDate() - i);
    const iso = data.toISOString().slice(0, 10);
    const [, mes, dia] = iso.split("-");
    dias.push({ data: iso, label: `${dia}/${mes}`, quantidade: contagem.get(iso) ?? 0 });
  }
  return dias;
}

export interface PecasEmProducaoPorBancaItem {
  banca_id: string;
  nome: string;
  quantidade: number;
}

/**
 * Peças "em produção" (mesma definição de STATUS_EM_ANDAMENTO já usada
 * no Relatório de Produção: em_corte/embalagem/revisao/despacho, exclui
 * pronto) agrupadas por banca terceirizada. Só bancas ativas com pelo
 * menos 1 peça em produção aparecem — mesmo espírito do card de Mesas
 * de Corte, que só lista mesas ativas.
 */
export function calcularPecasEmProducaoPorBanca(
  linhas: RelatorioProducaoLinha[],
  bancas: Banca[],
): PecasEmProducaoPorBancaItem[] {
  const nomesAtivos = new Map(bancas.filter((b) => b.ativo).map((b) => [b.id, b.nome]));
  const contagem = new Map<string, number>();
  for (const linha of linhas) {
    if (!linha.banca_id || !nomesAtivos.has(linha.banca_id)) continue;
    if (!STATUS_EM_ANDAMENTO.includes(linha.status)) continue;
    contagem.set(linha.banca_id, (contagem.get(linha.banca_id) ?? 0) + linha.quantidade_total);
  }
  return Array.from(contagem.entries())
    .map(([banca_id, quantidade]) => ({ banca_id, nome: nomesAtivos.get(banca_id)!, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}
