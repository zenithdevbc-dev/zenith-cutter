import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import ExcelJS from "exceljs";

/** Cor primária da marca (--primary: #A30620) — usada no cabeçalho das tabelas PDF exportadas. */
export const COR_PRIMARIA_PDF: [number, number, number] = [163, 6, 32];

export function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function gerarCsv(colunas: string[], linhas: (string | number)[][], nomeArquivo: string): void {
  const escapar = (valor: string | number) => `"${String(valor).replace(/"/g, '""')}"`;
  const corpo = linhas.map((linha) => linha.map(escapar).join(","));
  // BOM (﻿) garante acentuação correta ao abrir no Excel no Windows.
  const csv = "﻿" + [colunas.map(escapar).join(","), ...corpo].join("\r\n");
  baixarBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), nomeArquivo);
}

export async function gerarExcel(
  nomeAba: string,
  colunas: string[],
  linhas: (string | number)[][],
  nomeArquivo: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(nomeAba);
  sheet.columns = colunas.map((header) => ({ header, width: 18 }));
  sheet.addRows(linhas);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  baixarBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    nomeArquivo,
  );
}

export function gerarPdfTabela(params: {
  titulo: string;
  subtitulo?: string;
  colunas: string[];
  linhas: (string | number)[][];
  nomeArquivo: string;
}): void {
  const { titulo, subtitulo, colunas, linhas, nomeArquivo } = params;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  let startY = 22;
  if (subtitulo) {
    doc.setFontSize(9);
    doc.text(subtitulo, 14, 22);
    startY = 27;
  }
  autoTable(doc, {
    startY,
    head: [colunas],
    body: linhas,
    styles: { fontSize: 8 },
    headStyles: { fillColor: COR_PRIMARIA_PDF },
  });
  doc.save(nomeArquivo);
}
