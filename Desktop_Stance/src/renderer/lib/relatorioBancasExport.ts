import type { BancaAgregadaLinha } from "@/lib/relatorioBancas";
import { gerarCsv, gerarExcel, gerarPdfTabela } from "@/lib/exportUtils";

const COLUNAS = ["Terceiro", "Status", "Peças", "Última Atividade"];

function paraLinhasExportaveis(linhas: BancaAgregadaLinha[]): (string | number)[][] {
  return linhas.map((linha) => [
    linha.banca,
    linha.ativo ? "Ativo" : "Inativo",
    linha.pecas,
    linha.ultimaAtividade ? new Date(linha.ultimaAtividade).toLocaleDateString("pt-BR") : "—",
  ]);
}

export function exportarRelatorioBancasCsv(linhas: BancaAgregadaLinha[]): void {
  gerarCsv(COLUNAS, paraLinhasExportaveis(linhas), "relatorio-terceiros.csv");
}

export function exportarRelatorioBancasExcel(linhas: BancaAgregadaLinha[]): Promise<void> {
  return gerarExcel(
    "Relatório de Terceiros",
    COLUNAS,
    paraLinhasExportaveis(linhas),
    "relatorio-terceiros.xlsx",
  );
}

export function exportarRelatorioBancasPdf(linhas: BancaAgregadaLinha[]): void {
  gerarPdfTabela({
    titulo: "Relatório de Terceiros",
    subtitulo: `${linhas.length} terceiro(s)`,
    colunas: COLUNAS,
    linhas: paraLinhasExportaveis(linhas),
    nomeArquivo: "relatorio-terceiros.pdf",
  });
}
