import type { BancaAgregadaLinha } from "@/lib/relatorioBancas";
import { gerarCsv, gerarExcel, gerarPdfTabela } from "@/lib/exportUtils";

const COLUNAS = ["Banca", "Status", "Peças", "Última Atividade"];

function paraLinhasExportaveis(linhas: BancaAgregadaLinha[]): (string | number)[][] {
  return linhas.map((linha) => [
    linha.banca,
    linha.ativo ? "Ativa" : "Inativa",
    linha.pecas,
    linha.ultimaAtividade ? new Date(linha.ultimaAtividade).toLocaleDateString("pt-BR") : "—",
  ]);
}

export function exportarRelatorioBancasCsv(linhas: BancaAgregadaLinha[]): void {
  gerarCsv(COLUNAS, paraLinhasExportaveis(linhas), "relatorio-bancas.csv");
}

export function exportarRelatorioBancasExcel(linhas: BancaAgregadaLinha[]): Promise<void> {
  return gerarExcel(
    "Relatório de Bancas",
    COLUNAS,
    paraLinhasExportaveis(linhas),
    "relatorio-bancas.xlsx",
  );
}

export function exportarRelatorioBancasPdf(linhas: BancaAgregadaLinha[]): void {
  gerarPdfTabela({
    titulo: "Relatório de Bancas",
    subtitulo: `${linhas.length} banca(s)`,
    colunas: COLUNAS,
    linhas: paraLinhasExportaveis(linhas),
    nomeArquivo: "relatorio-bancas.pdf",
  });
}
