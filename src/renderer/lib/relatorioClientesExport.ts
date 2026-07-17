import type { ClienteAgregadoLinha } from "@/lib/relatorioClientes";
import { formatarMateriaisUsados } from "@/lib/relatorioClientes";
import { formatarDuracaoMinutos } from "@/lib/relatorioProducao";
import { gerarCsv, gerarExcel, gerarPdfTabela } from "@/lib/exportUtils";

const COLUNAS = ["Cliente", "Ordens", "Última Ordem", "Materiais Usados", "Tempo Médio de Produção"];

function paraLinhasExportaveis(linhas: ClienteAgregadoLinha[]): (string | number)[][] {
  return linhas.map((linha) => [
    linha.cliente,
    linha.ordens,
    new Date(linha.ultimaOrdem).toLocaleDateString("pt-BR"),
    formatarMateriaisUsados(linha.materiaisUsados, linha.materiaisUsados.length),
    formatarDuracaoMinutos(linha.tempoMedioMinutos),
  ]);
}

export function exportarRelatorioClientesCsv(linhas: ClienteAgregadoLinha[]): void {
  gerarCsv(COLUNAS, paraLinhasExportaveis(linhas), "relatorio-clientes.csv");
}

export function exportarRelatorioClientesExcel(linhas: ClienteAgregadoLinha[]): Promise<void> {
  return gerarExcel(
    "Relatório de Clientes",
    COLUNAS,
    paraLinhasExportaveis(linhas),
    "relatorio-clientes.xlsx",
  );
}

export function exportarRelatorioClientesPdf(linhas: ClienteAgregadoLinha[]): void {
  gerarPdfTabela({
    titulo: "Relatório de Clientes",
    subtitulo: `${linhas.length} cliente(s)`,
    colunas: COLUNAS,
    linhas: paraLinhasExportaveis(linhas),
    nomeArquivo: "relatorio-clientes.pdf",
  });
}
