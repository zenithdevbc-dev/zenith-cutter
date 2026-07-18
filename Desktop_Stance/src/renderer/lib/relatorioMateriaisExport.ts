import type { MaterialAgregadoLinha } from "@/lib/relatorioMateriais";
import { gerarCsv, gerarExcel, gerarPdfTabela } from "@/lib/exportUtils";

const COLUNAS = ["Material", "Cor", "Ordens", "Peças Produzidas", "Perdas Registradas"];

function paraLinhasExportaveis(linhas: MaterialAgregadoLinha[]): (string | number)[][] {
  return linhas.map((linha) => [
    linha.material,
    linha.cor,
    linha.ordens,
    linha.pecasProduzidas,
    linha.perdasRegistradas,
  ]);
}

export function exportarRelatorioMateriaisCsv(linhas: MaterialAgregadoLinha[]): void {
  gerarCsv(COLUNAS, paraLinhasExportaveis(linhas), "relatorio-materiais.csv");
}

export function exportarRelatorioMateriaisExcel(linhas: MaterialAgregadoLinha[]): Promise<void> {
  return gerarExcel(
    "Relatório de Materiais",
    COLUNAS,
    paraLinhasExportaveis(linhas),
    "relatorio-materiais.xlsx",
  );
}

export function exportarRelatorioMateriaisPdf(linhas: MaterialAgregadoLinha[]): void {
  gerarPdfTabela({
    titulo: "Relatório de Materiais",
    subtitulo: `${linhas.length} material(is)`,
    colunas: COLUNAS,
    linhas: paraLinhasExportaveis(linhas),
    nomeArquivo: "relatorio-materiais.pdf",
  });
}
