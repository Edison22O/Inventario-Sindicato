import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import { getImageUrl } from './getImageUrl';
import type { Product, MaintenanceLog } from '../types';
import toast from 'react-hot-toast';

const loadImageBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
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

export const generateProductPDF = async (product: Product) => {
  const toastId = toast.loading('Generando PDF de la ficha técnica...');
  try {
    // 1. Obtener los mantenimientos
    const mantRes = await api.get(`/maintenances/?product=${product.id}`);
    const maintenances: MaintenanceLog[] = mantRes.data;

    // 2. Preparar el documento
    const doc = new jsPDF('portrait', 'mm', 'a4');
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
        doc.addImage(base64Img, 'JPEG', 14, currentY, imageWidth, imageHeight);
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
    doc.setFont('', 'bold');
    doc.text('Estado Actual:', textStartX, currentY + 24);
    doc.setFont('', 'normal');
    doc.text(product.estado || 'No definido', textStartX + 30, currentY + 24);

    // Ubicación
    doc.setFont('', 'bold');
    doc.text('Ubicación:', textStartX, currentY + 31);
    doc.setFont('', 'normal');
    doc.text(product.department_name || String(product.department), textStartX + 30, currentY + 31);

    // Categoría
    doc.setFont('', 'bold');
    doc.text('Categoría:', textStartX, currentY + 38);
    doc.setFont('', 'normal');
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

    autoTable(doc, {
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
      doc.setFont('', 'bold');
      doc.text('Características Adicionales:', 14, currentY);
      currentY += 6;
      
      doc.setFontSize(10);
      doc.setFont('', 'normal');
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
      doc.setFont('', 'bold');
      doc.text('Historial de Mantenimientos', 14, currentY);
      currentY += 6;

      const mantData = maintenances.map(m => [
        m.fecha ? new Date(`${m.fecha}T12:00:00`).toLocaleDateString('es-EC') : '-',
        m.realizado_por,
        m.estado_resultante,
        `$${Number(m.costo).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
        m.descripcion
      ]);

      autoTable(doc, {
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

    doc.save(`Ficha_Tecnica_${product.codigo}.pdf`);
    toast.success('PDF generado exitosamente', { id: toastId });

  } catch (error) {
    console.error('Error generating product PDF:', error);
    toast.error('Error al generar la ficha técnica', { id: toastId });
  }
};
