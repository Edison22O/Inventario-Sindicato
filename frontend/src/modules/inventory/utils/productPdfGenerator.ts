import jsPDF from 'jspdf';
import { applyAutoTable } from '@/shared/utils/pdfHelper';
import api from '@/shared/services/api';
import { getImageUrl } from '@/shared/utils/getImageUrl';
import type { Product, MaintenanceLog } from '@/shared/types';
import toast from 'react-hot-toast';

const loadImageBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) return null;

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image', error);
    return null;
  }
};

const addProductPageToDoc = async (
  doc: jsPDF,
  product: Product,
  maintenances: MaintenanceLog[],
  isFirstPage: boolean
) => {
  if (!isFirstPage) {
    doc.addPage();
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Cabecera institucional
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('Ficha Técnica de Equipo', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Sindicato de Choferes Profesionales del Cantón Espejo', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  // Línea separadora
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 10;

  // Sección superior: Imagen y Datos principales
  const startSectionY = currentY;

  // Imagen
  let imageWidth = 45;
  let imageHeight = 45;
  if (product.image) {
    const base64Img = await loadImageBase64(getImageUrl(product.image));
    if (base64Img) {
      let format = 'JPEG';
      if (base64Img.startsWith('data:image/png')) format = 'PNG';
      else if (base64Img.startsWith('data:image/webp')) format = 'WEBP';
      doc.addImage(base64Img, format, 14, currentY, imageWidth, imageHeight);
    } else {
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, currentY, imageWidth, imageHeight, 3, 3, 'FD');
      doc.setTextColor(148, 163, 184);
      doc.text('Sin Foto', 14 + imageWidth / 2, currentY + imageHeight / 2 + 2, { align: 'center' });
    }
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, imageWidth, imageHeight, 3, 3, 'FD');
    doc.setTextColor(148, 163, 184);
    doc.text('Sin Foto', 14 + imageWidth / 2, currentY + imageHeight / 2 + 2, { align: 'center' });
  }

  // Datos principales (a la derecha de la imagen)
  const textStartX = 14 + imageWidth + 10;
  
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(product.nombre, textStartX, currentY + 6);

  doc.setFontSize(12);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`CÓDIGO: ${product.codigo}`, textStartX, currentY + 14);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  
  // Estado
  doc.setFont('helvetica', 'bold');
  doc.text('Estado Actual:', textStartX, currentY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(product.estado || 'No definido', textStartX + 30, currentY + 24);

  // Ubicación
  doc.setFont('helvetica', 'bold');
  doc.text('Ubicación:', textStartX, currentY + 31);
  doc.setFont('helvetica', 'normal');
  doc.text(product.department_name || String(product.department), textStartX + 30, currentY + 31);

  // Categoría
  doc.setFont('helvetica', 'bold');
  doc.text('Categoría:', textStartX, currentY + 38);
  doc.setFont('helvetica', 'normal');
  doc.text(product.category_name || String(product.category) || '-', textStartX + 30, currentY + 38);

  currentY = Math.max(startSectionY + imageHeight + 15, currentY + 45);

  // Título de Detalles Técnicos
  doc.setFontSize(14);
  doc.setTextColor(5, 150, 105);
  doc.text('Detalles Técnicos y de Compra', 14, currentY);
  currentY += 8;

  // Tabla de Especificaciones
  const specsData = [
    ['Marca:', product.marca || '-', 'Modelo:', product.modelo || '-'],
    ['Serie:', product.serie || '-', 'Color:', product.color || '-'],
    ['Cantidad en Inv.:', `${product.cantidad} unidades`, 'Costo Unitario:', `$${Number(product.costo || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`],
    ['Costo Total:', `$${(Number(product.costo || 0) * product.cantidad).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`, 'Proveedor:', product.supplier_name || '-'],
    ['Fecha de Compra:', product.fecha_compra ? new Date(`${product.fecha_compra}T12:00:00`).toLocaleDateString('es-EC') : '-', 'Ingreso Sistema:', product.fecha_ingreso ? new Date(product.fecha_ingreso).toLocaleDateString('es-EC') : '-'],
  ];

  applyAutoTable(doc, {
    startY: currentY,
    body: specsData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 40 },
      1: { textColor: [15, 23, 42], cellWidth: 50 },
      2: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 40 },
      3: { textColor: [15, 23, 42], cellWidth: 50 },
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Características Especiales
  if (product.caracteristicas) {
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Características Adicionales:', 14, currentY);
    currentY += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    const splitText = doc.splitTextToSize(product.caracteristicas, pageWidth - 28);
    doc.text(splitText, 14, currentY);
    currentY += (splitText.length * 5) + 10;
  }

  // Mantenimientos
  if (maintenances.length > 0) {
    if (currentY > pageWidth - 60) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Mantenimientos', 14, currentY);
    currentY += 6;

    const mantData = maintenances.map(m => [
      m.fecha ? new Date(`${m.fecha}T12:00:00`).toLocaleDateString('es-EC') : '-',
      m.realizado_por,
      m.estado_resultante,
      `$${Number(m.costo).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
      m.descripcion
    ]);

    applyAutoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Técnico', 'Estado', 'Costo', 'Descripción']],
      body: mantData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' }
      }
    });
  }
};

export const generateProductPDF = async (product: Product) => {
  const toastId = toast.loading('Generando PDF de la ficha técnica...');
  try {
    const mantRes = await api.get(`/maintenances/?product=${product.public_id}`);
    const maintenances: MaintenanceLog[] = mantRes.data;

    const doc = new jsPDF('portrait', 'mm', 'a4');
    await addProductPageToDoc(doc, product, maintenances, true);

    doc.save(`Ficha_Tecnica_${product.codigo}.pdf`);
    toast.success('PDF generado exitosamente', { id: toastId });

  } catch (error: any) {
    console.error('Error generating product PDF:', error);
    toast.error('Error al generar la ficha técnica: ' + (error?.message || String(error)), { id: toastId, duration: 8000 });
  }
};

export const generateBulkProductsPDF = async (products: Product[], allMaintenances: MaintenanceLog[], filename: string) => {
  if (!products || products.length === 0) {
    toast.error('No hay productos para exportar');
    return;
  }
  const toastId = toast.loading('Generando PDF consolidado...');
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const productMaintenances = allMaintenances.filter(m => m.product === product.id);
      await addProductPageToDoc(doc, product, productMaintenances, i === 0);
    }

    doc.save(filename);
    toast.success('PDF consolidado generado exitosamente', { id: toastId });
  } catch (error: any) {
    console.error('Error generating bulk PDF:', error);
    toast.error('Error al generar el reporte: ' + (error?.message || String(error)), { id: toastId, duration: 8000 });
  }
};

export const generateTablePDF = async (products: Product[], filename: string, title: string) => {
  if (!products || products.length === 0) {
    toast.error('No hay productos para exportar');
    return;
  }
  const toastId = toast.loading('Generando PDF en formato tabla...');
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Título Principal y Cabecera Institucional
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(title, pageWidth / 2, 16, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Sindicato de Choferes Profesionales del Cantón Espejo — Fecha de emisión: ${new Date().toLocaleDateString('es-EC')}`, pageWidth / 2, 23, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 28, pageWidth - 14, 28);

    // Pre-cargar imágenes base64 para los productos
    const imagesByProductId: Record<number, string> = {};
    for (const p of products) {
      if (p.image) {
        const b64 = await loadImageBase64(getImageUrl(p.image));
        if (b64) imagesByProductId[p.id] = b64;
      }
    }

    // Agrupar productos por departamento
    const departmentGroups: Record<string, Product[]> = {};
    products.forEach((p) => {
      const deptName = p.department_name || (typeof p.department === 'string' ? p.department : 'Sin Ubicación');
      if (!departmentGroups[deptName]) {
        departmentGroups[deptName] = [];
      }
      departmentGroups[deptName].push(p);
    });

    const sortedDeptNames = Object.keys(departmentGroups).sort((a, b) => a.localeCompare(b));

    let currentY = 34;

    // Resumen de departamento para la sección final
    const deptSummaries: { name: string; equipos: number; costo: number }[] = [];

    for (let dIdx = 0; dIdx < sortedDeptNames.length; dIdx++) {
      const deptName = sortedDeptNames[dIdx];
      const deptProducts = departmentGroups[deptName];

      const deptEquipos = deptProducts.reduce((sum, p) => sum + (p.cantidad || 0), 0);
      const deptCosto = deptProducts.reduce((sum, p) => sum + (Number(p.costo || 0) * (p.cantidad || 0)), 0);

      deptSummaries.push({ name: deptName, equipos: deptEquipos, costo: deptCosto });

      // Verificar si hay espacio para el encabezado del departamento + tabla
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      // Título de Sección del Departamento
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(167, 243, 208); // emerald-200
      doc.roundedRect(14, currentY, pageWidth - 28, 9, 2, 2, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(4, 120, 87); // emerald-800
      doc.text(`UBICACIÓN / DEPARTAMENTO: ${deptName.toUpperCase()}`, 18, currentY + 6);
      currentY += 12;

      // Armar filas de productos para este departamento
      const tableBody: any[] = [];
      const imageIndexMap: Record<number, string> = {};

      deptProducts.forEach((p, pIdx) => {
        if (imagesByProductId[p.id]) {
          imageIndexMap[pIdx] = imagesByProductId[p.id];
        }

        const unitCost = Number(p.costo || 0);
        const totalCost = unitCost * (p.cantidad || 0);

        tableBody.push([
          '', // Espacio para imagen
          p.codigo,
          p.color ? `${p.nombre}\nColor: ${p.color}` : p.nombre,
          `${p.marca || '-'}${p.modelo ? ' / ' + p.modelo : ''}`,
          p.category_name || '-',
          p.estado || '-',
          p.cantidad,
          `$${unitCost.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${totalCost.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
      });

      // Agregar fila de subtotal del departamento
      tableBody.push([
        '',
        '',
        `SUBTOTAL DEPARTAMENTO (${deptName.toUpperCase()})`,
        '',
        '',
        '',
        deptEquipos,
        '',
        `$${deptCosto.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      const subtotalRowIndex = tableBody.length - 1;

      applyAutoTable(doc, {
        startY: currentY,
        head: [['Foto', 'Código', 'Producto', 'Marca / Modelo', 'Categoría', 'Estado', 'Cant.', 'Precio Unit.', 'Precio Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
        styles: { cellPadding: 2, fontSize: 8, minCellHeight: 14, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 38 },
          4: { cellWidth: 30 },
          5: { cellWidth: 22 },
          6: { cellWidth: 15, halign: 'right' },
          7: { cellWidth: 26, halign: 'right' },
          8: { cellWidth: 30, halign: 'right' }
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.row.index === subtotalRowIndex) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [236, 253, 245]; // emerald-50
            data.cell.styles.textColor = [4, 120, 87];   // emerald-800
          }
        },
        didDrawCell: (data: any) => {
          if (data.column.index === 0 && data.cell.section === 'body' && data.row.index !== subtotalRowIndex) {
            const rIdx = data.row.index;
            if (imageIndexMap[rIdx]) {
              let format = 'JPEG';
              if (imageIndexMap[rIdx].startsWith('data:image/png')) format = 'PNG';
              else if (imageIndexMap[rIdx].startsWith('data:image/webp')) format = 'WEBP';
              
              const dim = 12;
              const x = data.cell.x + (data.cell.width - dim) / 2;
              const y = data.cell.y + (data.cell.height - dim) / 2;
              doc.addImage(imageIndexMap[rIdx], format, x, y, dim, dim);
            }
          }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // --- SECCIÓN FINAL: RESUMEN Y TOTAL GENERAL DE TODOS LOS DEPARTAMENTOS ---
    if (currentY > pageHeight - 65) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('RESUMEN DE INVENTARIO Y TOTAL GENERAL', 14, currentY);
    currentY += 6;

    const summaryTableBody = deptSummaries.map((ds) => [
      ds.name,
      ds.equipos.toString(),
      `$${ds.costo.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    const grandTotalEquipos = deptSummaries.reduce((sum, ds) => sum + ds.equipos, 0);
    const grandTotalCosto = deptSummaries.reduce((sum, ds) => sum + ds.costo, 0);

    summaryTableBody.push([
      'TOTAL GENERAL (TODOS LOS DEPARTAMENTOS)',
      grandTotalEquipos.toString(),
      `$${grandTotalCosto.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    const grandTotalRowIndex = summaryTableBody.length - 1;

    applyAutoTable(doc, {
      startY: currentY,
      head: [['Departamento / Ubicación', 'Cantidad de Equipos', 'Valor Total Invertido ($)']],
      body: summaryTableBody,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { cellPadding: 3, fontSize: 8.5, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 45, halign: 'center' },
        2: { cellWidth: 60, halign: 'right' }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.row.index === grandTotalRowIndex) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [5, 150, 105]; // emerald-600
          data.cell.styles.textColor = [255, 255, 255]; // blanco
          data.cell.styles.fontSize = 9.5;
        }
      }
    });

    doc.save(filename);
    toast.success('PDF generado exitosamente', { id: toastId });
  } catch (error: any) {
    console.error('Error generating table PDF:', error);
    toast.error('Error al generar PDF: ' + (error?.message || String(error)), { id: toastId, duration: 8000 });
  }
};
