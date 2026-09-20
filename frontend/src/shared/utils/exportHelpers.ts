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

export const exportProgressMatrixToPDF = (
  instructorName: string,
  filterLabel: string,
  studentsData: any[]
) => {
  const doc = new jsPDF('landscape');
  const dateStr = new Date().toLocaleDateString('es-EC');

  // Title Header
  doc.setFontSize(13);
  doc.setTextColor(6, 78, 59); // Emerald 900
  doc.setFont('helvetica', 'bold');
  doc.text('SINDICATO DE CHOFERES PROFESIONALES DEL CANTÓN ESPEJO', 14, 13);

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('MATRIZ DE RENDIMIENTO ACADÉMICO DE ALUMNOS (AVANCE Y NOTAS)', 14, 19);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Instructor: ${instructorName}    |    Categoría / Licencia: ${filterLabel}    |    Fecha: ${dateStr}`, 14, 25);

  const isTipoE = filterLabel.toLowerCase().includes('tipo e') || filterLabel.toLowerCase().includes('licencia e');
  const headers = isTipoE ? [
    'N°',
    'Estudiante',
    'Cédula',
    'Licencia',
    'Deberes (NPR)',
    'Trab. Grupo (Sinotruc B)',
    'Pruebas (Sinotruc G)',
    'Examen (Tráiler/Bus)',
    'Promedio',
    'Estado'
  ] : [
    'N°',
    'Estudiante',
    'Cédula',
    'Licencia',
    'Deberes (F1)',
    'Trab. Grupo (F2)',
    'Trab. Ind. (F3)',
    'Pruebas (F4)',
    'Examen (F5)',
    'Promedio',
    'Estado'
  ];

  const rows = studentsData.map((st, idx) => {
    const fases = st.fasesToRender || st.fases || [];
    const f1 = fases[0] ? `${fases[0].nota.toFixed(2)} (${fases[0].is_passed ? 'Aprob' : 'Pend'})` : '0.00';
    const f2 = fases[1] ? `${fases[1].nota.toFixed(2)} (${fases[1].is_passed ? 'Aprob' : 'Pend'})` : '0.00';
    const f3 = fases[2] ? `${fases[2].nota.toFixed(2)} (${fases[2].is_passed ? 'Aprob' : 'Pend'})` : '0.00';
    const f4 = fases[3] ? `${fases[3].nota.toFixed(2)} (${fases[3].is_passed ? 'Aprob' : 'Pend'})` : '0.00';
    const f5 = fases[4] ? `${fases[4].nota.toFixed(2)} (${fases[4].is_passed ? 'Aprob' : 'Pend'})` : '0.00';
    const promVal = (st.promedioToRender !== undefined ? st.promedioToRender : st.promedio);
    const promStr = (promVal || 0).toFixed(2);
    const estadoGral = parseFloat(promStr) >= 16.0 ? 'APROBADO' : (parseFloat(promStr) > 0 ? 'EN PROGRESO' : 'PENDIENTE');

    return [
      idx + 1,
      st.student_name,
      st.cedula || '---',
      st.tipo_licencia,
      f1,
      f2,
      f3,
      f4,
      f5,
      promStr,
      estadoGral
    ];
  });

  applyAutoTable(doc, {
    startY: 29,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { 
      fillColor: [6, 78, 59], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 2.5,
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 26 },
      6: { halign: 'center', cellWidth: 26 },
      7: { halign: 'center', cellWidth: 26 },
      8: { halign: 'center', cellWidth: 26 },
      9: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
      10: { halign: 'center', fontStyle: 'bold', cellWidth: 24 }
    }
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 22 : 140;
  if (finalY < 185) {
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.5);

    // Signature 1
    doc.line(35, finalY, 115, finalY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(instructorName.toUpperCase(), 75, finalY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('INSTRUCTOR DE PRÁCTICAS DE CONDUCCIÓN', 75, finalY + 8, { align: 'center' });

    // Signature 2
    doc.line(175, finalY, 255, finalY);
    doc.setFont('helvetica', 'bold');
    doc.text('DIRECTOR PEDAGÓGICO', 215, finalY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('SINDICATO DE CHOFERES RUMIÑAHUI', 215, finalY + 8, { align: 'center' });
  }

  const cleanInstName = instructorName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
  const cleanFilter = filterLabel.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
  doc.save(`Avance_Alumnos_${cleanInstName}_${cleanFilter}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToWord = (
  title: string,
  headers: string[],
  rows: (string | number)[][],
  fileName: string
) => {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; }
        h1 { font-size: 14pt; color: #064e3b; text-align: center; margin-bottom: 4px; font-weight: bold; }
        h2 { font-size: 11pt; color: #334155; text-align: center; margin-bottom: 20px; font-weight: normal; }
        table { border-collapse: collapse; width: 100%; margin-top: 15px; }
        th { background-color: #064e3b; color: #ffffff; padding: 8px; font-size: 10pt; border: 1px solid #047857; text-align: center; font-weight: bold; }
        td { padding: 6px; font-size: 9.5pt; border: 1px solid #cbd5e1; text-align: center; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { margin-top: 40px; font-size: 8.5pt; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>SINDICATO DE CHOFERES PROFESIONALES DEL CANTÓN ESPEJO</h1>
      <h2>${title} — Generado el ${new Date().toLocaleDateString('es-EC')}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <div class="footer">Documento Oficial generado automáticamente por el Sistema de Control Académico del Sindicato de Choferes de Espejo.</div>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

