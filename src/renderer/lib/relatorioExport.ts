import type { RelatorioProducaoLinha } from "@shared/models";
import { STATUS_ORDEM_CORTE_LABEL } from "@/lib/statusOrdemCorte";
import {
  calcularTempoProducaoMinutos,
  formatarDuracaoMinutos,
  type RelatorioProducaoKpis,
} from "@/lib/relatorioProducao";
import { gerarCsv, gerarExcel, gerarPdfTabela } from "@/lib/exportUtils";

const COLUNAS = ["Nº", "Cliente", "Material", "Operador", "Início", "Conclusão", "Tempo", "Status"];

function paraLinhasExportaveis(linhas: RelatorioProducaoLinha[]): (string | number)[][] {
  return linhas.map((linha) => [
    linha.numero,
    linha.cliente_nome,
    linha.tecido_nome,
    linha.operador_nome ?? "—",
    linha.iniciado_em ? new Date(linha.iniciado_em).toLocaleString("pt-BR") : "—",
    linha.finalizado_em ? new Date(linha.finalizado_em).toLocaleString("pt-BR") : "—",
    formatarDuracaoMinutos(calcularTempoProducaoMinutos(linha)),
    STATUS_ORDEM_CORTE_LABEL[linha.status],
  ]);
}

export function exportarRelatorioProducaoCsv(linhas: RelatorioProducaoLinha[]): void {
  gerarCsv(COLUNAS, paraLinhasExportaveis(linhas), "relatorio-producao.csv");
}

export function exportarRelatorioProducaoExcel(linhas: RelatorioProducaoLinha[]): Promise<void> {
  return gerarExcel(
    "Relatório de Produção",
    COLUNAS,
    paraLinhasExportaveis(linhas),
    "relatorio-producao.xlsx",
  );
}

export function exportarRelatorioProducaoPdf(
  linhas: RelatorioProducaoLinha[],
  kpis: RelatorioProducaoKpis,
): void {
  gerarPdfTabela({
    titulo: "Relatório de Produção",
    subtitulo: `Total de peças: ${kpis.totalPecas}  •  Concluídas: ${kpis.pecasConcluidas}  •  Em andamento: ${kpis.pecasEmAndamento}  •  Atrasadas: ${kpis.atrasadas}  •  Tempo médio: ${formatarDuracaoMinutos(kpis.tempoMedioMinutos)}`,
    colunas: COLUNAS,
    linhas: paraLinhasExportaveis(linhas),
    nomeArquivo: "relatorio-producao.pdf",
  });
}
