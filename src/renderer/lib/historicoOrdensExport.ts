import type { OrdemHistoricoLinha } from "@/lib/historicoOrdens";
import { STATUS_ORDEM_CORTE_LABEL } from "@/lib/statusOrdemCorte";
import { gerarCsv, gerarExcel, gerarPdfTabela } from "@/lib/exportUtils";

const COLUNAS = [
  "Nº",
  "Cliente",
  "Material",
  "Peças",
  "Criado em",
  "Início",
  "Conclusão",
  "Status",
];

function paraLinhasExportaveis(linhas: OrdemHistoricoLinha[]): (string | number)[][] {
  return linhas.map((linha) => [
    linha.numero,
    linha.cliente_nome,
    linha.tecido_nome,
    linha.quantidade_total,
    new Date(linha.criado_em).toLocaleString("pt-BR"),
    linha.iniciado_em ? new Date(linha.iniciado_em).toLocaleString("pt-BR") : "—",
    linha.finalizado_em ? new Date(linha.finalizado_em).toLocaleString("pt-BR") : "—",
    STATUS_ORDEM_CORTE_LABEL[linha.status],
  ]);
}

export function exportarHistoricoOrdensCsv(linhas: OrdemHistoricoLinha[]): void {
  gerarCsv(COLUNAS, paraLinhasExportaveis(linhas), "historico-ordens.csv");
}

export function exportarHistoricoOrdensExcel(linhas: OrdemHistoricoLinha[]): Promise<void> {
  return gerarExcel(
    "Histórico de Ordens",
    COLUNAS,
    paraLinhasExportaveis(linhas),
    "historico-ordens.xlsx",
  );
}

export function exportarHistoricoOrdensPdf(linhas: OrdemHistoricoLinha[]): void {
  gerarPdfTabela({
    titulo: "Histórico de Ordens",
    subtitulo: `${linhas.length} ordem(ns)`,
    colunas: COLUNAS,
    linhas: paraLinhasExportaveis(linhas),
    nomeArquivo: "historico-ordens.pdf",
  });
}
