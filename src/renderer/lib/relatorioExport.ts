import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import ExcelJS from "exceljs";
import type { RelatorioProducaoLinha } from "@shared/models";
import { STATUS_ORDEM_CORTE_LABEL } from "@/lib/statusOrdemCorte";
import {
  calcularTempoProducaoMinutos,
  formatarDuracaoMinutos,
  type RelatorioProducaoKpis,
} from "@/lib/relatorioProducao";

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

function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportarRelatorioProducaoCsv(linhas: RelatorioProducaoLinha[]): void {
  const escapar = (valor: string | number) => `"${String(valor).replace(/"/g, '""')}"`;
  const corpo = paraLinhasExportaveis(linhas).map((linha) => linha.map(escapar).join(","));
  const csv = "﻿" + [COLUNAS.map(escapar).join(","), ...corpo].join("\r\n");
  baixarBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "relatorio-producao.csv");
}

export async function exportarRelatorioProducaoExcel(
  linhas: RelatorioProducaoLinha[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório de Produção");
  sheet.columns = COLUNAS.map((header) => ({ header, width: 18 }));
  sheet.addRows(paraLinhasExportaveis(linhas));
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  baixarBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "relatorio-producao.xlsx",
  );
}

export function exportarRelatorioProducaoPdf(
  linhas: RelatorioProducaoLinha[],
  kpis: RelatorioProducaoKpis,
): void {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Relatório de Produção", 14, 16);
  doc.setFontSize(9);
  doc.text(
    `Total: ${kpis.totalOrdens}  •  Concluídas: ${kpis.concluidas}  •  Em andamento: ${kpis.emAndamento}  •  Atrasadas: ${kpis.atrasadas}  •  Tempo médio: ${formatarDuracaoMinutos(kpis.tempoMedioMinutos)}`,
    14,
    22,
  );
  autoTable(doc, {
    startY: 27,
    head: [COLUNAS],
    body: paraLinhasExportaveis(linhas),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [163, 6, 32] },
  });
  doc.save("relatorio-producao.pdf");
}
