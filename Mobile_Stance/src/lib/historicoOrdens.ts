import type { OrdemCorteResumo, RelatorioProducaoLinha, StatusOrdemCorte } from '../models';

/** Porta de `Desktop_Stance/src/renderer/lib/historicoOrdens.ts` — funções puras. */

export interface OrdemHistoricoLinha extends OrdemCorteResumo {
  operador_id: string | null;
  operador_nome: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
}

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
  produtoId: string;
  tecidoId: string;
  etapas: StatusOrdemCorte[];
  operadorId: string;
  dataInicio: string;
  dataFim: string;
}

export const FILTROS_HISTORICO_VAZIOS: HistoricoOrdensFiltros = {
  numero: '',
  clienteId: 'todos',
  produtoId: 'todos',
  tecidoId: 'todos',
  etapas: [],
  operadorId: 'todos',
  dataInicio: '',
  dataFim: '',
};

export function filtrarHistoricoOrdens(
  linhas: OrdemHistoricoLinha[],
  filtros: HistoricoOrdensFiltros,
): OrdemHistoricoLinha[] {
  const numeroBusca = filtros.numero.trim();
  return linhas.filter((linha) => {
    if (numeroBusca && !String(linha.numero).includes(numeroBusca)) return false;
    if (filtros.clienteId !== 'todos' && linha.cliente_id !== filtros.clienteId) return false;
    if (filtros.produtoId !== 'todos' && linha.produto_id !== filtros.produtoId) return false;
    if (filtros.tecidoId !== 'todos' && linha.tecido_id !== filtros.tecidoId) return false;
    if (filtros.etapas.length > 0 && !filtros.etapas.includes(linha.status)) return false;
    if (filtros.operadorId !== 'todos' && linha.operador_id !== filtros.operadorId) return false;
    const dataCriacao = linha.criado_em.slice(0, 10);
    if (filtros.dataInicio && dataCriacao < filtros.dataInicio) return false;
    if (filtros.dataFim && dataCriacao > filtros.dataFim) return false;
    return true;
  });
}
