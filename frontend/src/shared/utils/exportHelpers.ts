import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { applyAutoTable } from './pdfHelper';

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Reporte') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportTableToPDF = (
  title: string,
  headers: string[],
  rows: (string | number)[][],
  fileName: string
) => {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129); // Emerald 600
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sindicato de Choferes Profesional - Generado el ${new Date().toLocaleDateString('es-EC')}`, 14, 22);

  applyAutoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
  });

  doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
