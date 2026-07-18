import type { OperadorAgregadoLinha } from "@/lib/relatorioOperadores";
import { formatarDuracaoMinutos } from "@/lib/relatorioProducao";
import { gerarCsv, gerarExcel, gerarPdfTabela } from "@/lib/exportUtils";

const COLUNAS = [
  "Operador",
  "Peças Concluídas",
  "Peças em Andamento",
  "Tempo Médio de Produção",
  "Última Atividade",
];

function paraLinhasExportaveis(linhas: OperadorAgregadoLinha[]): (string | number)[][] {
  return linhas.map((linha) => [
    linha.operador,
    linha.pecasConcluidas,
    linha.pecasEmAndamento,
    formatarDuracaoMinutos(linha.tempoMedioMinutos),
    linha.ultimaAtividade ? new Date(linha.ultimaAtividade).toLocaleString("pt-BR") : "—",
  ]);
}

export function exportarRelatorioOperadoresCsv(linhas: OperadorAgregadoLinha[]): void {
  gerarCsv(COLUNAS, paraLinhasExportaveis(linhas), "relatorio-operadores.csv");
}

export function exportarRelatorioOperadoresExcel(linhas: OperadorAgregadoLinha[]): Promise<void> {
  return gerarExcel(
    "Relatório de Operadores",
    COLUNAS,
    paraLinhasExportaveis(linhas),
    "relatorio-operadores.xlsx",
  );
}

export function exportarRelatorioOperadoresPdf(linhas: OperadorAgregadoLinha[]): void {
  gerarPdfTabela({
    titulo: "Relatório de Operadores",
    subtitulo: `${linhas.length} operador(es)`,
    colunas: COLUNAS,
    linhas: paraLinhasExportaveis(linhas),
    nomeArquivo: "relatorio-operadores.pdf",
  });
}
