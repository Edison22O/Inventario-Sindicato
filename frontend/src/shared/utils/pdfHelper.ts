import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const applyAutoTable = (doc: jsPDF, options: any) => {
  if (typeof autoTable === 'function') {
    autoTable(doc, options);
  } else if (autoTable && typeof (autoTable as any).default === 'function') {
    (autoTable as any).default(doc, options);
  } else if (typeof (doc as any).autoTable === 'function') {
    (doc as any).autoTable(options);
  } else {
    console.error('Could not resolve autoTable. Imported object:', autoTable);
    throw new TypeError('autoTable is not a function');
  }
};
