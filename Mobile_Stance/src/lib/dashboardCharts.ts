import {
  STATUS_ORDEM_CORTE_LABEL,
  type Banca,
  type OrdemCorteResumo,
  type RelatorioProducaoLinha,
  type StatusOrdemCorte,
} from '../models';
import { STATUS_EM_ANDAMENTO } from './relatorioProducao';

/**
 * Porta quase-verbatim de
 * `Desktop_Stance/src/renderer/lib/dashboardCharts.ts` — funções puras,
 * mesma matemática do desktop pra não divergir dos números mostrados lá.
 */

const STATUS_COR_GRAFICO: Record<StatusOrdemCorte, string> = {
  planejado: '#94A3B8',
  em_fila: '#F59E0B',
  enfesto: '#8B5CF6',
  corte: '#2563EB',
  embalagem: '#6366F1',
  despacho: '#0EA5E9',
  pronto: '#16A34A',
  cancelada: '#DC2626',
};

export interface DistribuicaoStatusItem {
  status: StatusOrdemCorte;
  nome: string;
  quantidade: number;
  cor: string;
}

export function calcularDistribuicaoStatus(ordens: OrdemCorteResumo[]): DistribuicaoStatusItem[] {
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

export function calcularProducaoUltimos30Dias(linhas: RelatorioProducaoLinha[]): ProducaoDiaItem[] {
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
    const [, mes, dia] = iso.split('-');
    dias.push({ data: iso, label: `${dia}/${mes}`, quantidade: contagem.get(iso) ?? 0 });
  }
  return dias;
}

export interface PecasEmProducaoPorBancaItem {
  banca_id: string;
  nome: string;
  quantidade: number;
}

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
