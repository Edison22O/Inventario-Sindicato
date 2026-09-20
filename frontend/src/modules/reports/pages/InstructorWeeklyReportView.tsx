import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/shared/services/api';
import { authService } from '@/services/authService';
import { toast } from 'react-hot-toast';
import { 
  FileText, Printer, ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { formatDateToLocalYYYYMMDD } from '@/shared/utils/dateUtils';
import type { StudentEvaluation, Vehicle, InstructorSchedule, PracticalAttendance } from '@/shared/types';
import { useWebSocket } from '@/shared/context/WebSocketContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
}

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const InstructorWeeklyReportView: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [instructors, setInstructors] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState('/logo.png');
  const [exportingPDF, setExportingPDF] = useState(false);

  const reportPaperRef = useRef<HTMLDivElement | null>(null);

  interface ClassLogItem {
  id: number;
  schedule?: number;
  instructor: number;
  student: number;
  student_name?: string;
  fecha: string;
  tema_actividad: string;
  observaciones?: string;
}

// Schedules, attendances, evaluations and class logs state for real-time dynamic filling
  const [schedules, setSchedules] = useState<InstructorSchedule[]>([]);
  const [attendances, setAttendances] = useState<PracticalAttendance[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<StudentEvaluation[]>([]);
  const [classLogs, setClassLogs] = useState<ClassLogItem[]>([]);

  // Selection & Week Navigation
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [baseDate, setBaseDate] = useState<Date>(new Date());

  // Role Checks
  const isGlobalAdmin = authService.isGlobalAdmin();
  const isVehicleAdmin = authService.isVehicleAdmin();
  const isAdmin = isGlobalAdmin || isVehicleAdmin;
  const currentUserId = authService.getUserId();

  // Compute Monday to Saturday for selected week
  const weekDays = useMemo(() => {
    const current = new Date(baseDate);
    const dayOfWeek = current.getDay(); // 0 Sunday, 1 Monday...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(current);
    monday.setDate(current.getDate() + distanceToMonday);

    const days: Date[] = [];
    for (let i = 0; i < 6; i++) { // Monday to Saturday
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  }, [baseDate]);



  const weekRangeText = useMemo(() => {
    if (weekDays.length === 0) return '';
    const startStr = weekDays[0].toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const endStr = weekDays[weekDays.length - 1].toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `Del ${startStr} al ${endStr}`;
  }, [weekDays]);

  // Calculate week number in year
  const weekNumber = useMemo(() => {
    if (weekDays.length === 0) return 1;
    const d = new Date(weekDays[0]);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, [weekDays]);

  // Initial Data Load
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [vehRes, instRes, settingsRes] = await Promise.all([
        api.get('/vehicles/').catch(() => ({ data: [] })),
        api.get('/instructors/').catch(() => ({ data: [] })),
        api.get('/system-settings/').catch(() => null)
      ]);

      const instList: UserItem[] = instRes.data || [];
      const vehList: Vehicle[] = vehRes.data || [];

      if (settingsRes?.data?.logo) {
        setLogoUrl(settingsRes.data.logo);
      }

      setInstructors(instList);
      setVehicles(vehList);

      let defaultInstId = selectedInstructorId;
      if (!isAdmin && currentUserId) {
        defaultInstId = currentUserId.toString();
      } else if (!defaultInstId) {
        if (currentUserId && instList.some(u => u.id === currentUserId)) {
          defaultInstId = currentUserId.toString();
        } else if (instList.length > 0) {
          defaultInstId = instList[0].id.toString();
        }
      }
      setSelectedInstructorId(defaultInstId);

      if (vehList.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vehList[0].id.toString());
      }
    } catch (e) {
      console.error('Error cargando información inicial del informe:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Schedules, Attendances, Student Evaluations & Class Logs for Selected Instructor
  const fetchInstructorWeekData = async () => {
    if (!selectedInstructorId) return;
    try {
      const [schedRes, attRes, evalRes, logsRes] = await Promise.all([
        api.get(`/instructor-schedules/?instructor=${selectedInstructorId}`).catch(() => ({ data: [] })),
        api.get(`/practical-attendances/?instructor=${selectedInstructorId}`).catch(() => ({ data: [] })),
        api.get(`/student-evaluations/?instructor=${selectedInstructorId}`).catch(() => ({ data: [] })),
        api.get(`/class-logs/?instructor=${selectedInstructorId}`).catch(() => ({ data: [] }))
      ]);

      setSchedules(schedRes.data || []);
      setAttendances(attRes.data || []);
      setEvaluationsList(evalRes.data || []);
      setClassLogs(logsRes.data || []);
    } catch (e) {
      console.error('Error cargando horarios del instructor:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedInstructorId) {
      fetchInstructorWeekData();
    }
  }, [selectedInstructorId]);

  useWebSocket(fetchInstructorWeekData);

  // Week Navigator Functions
  const changeWeek = (offsetWeeks: number) => {
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + (offsetWeeks * 7));
    setBaseDate(nextDate);
  };

  const resetToToday = () => {
    setBaseDate(new Date());
  };

  // Selected Instructor Object
  const selectedInstructorObj = useMemo(() => {
    return instructors.find(u => u.id.toString() === selectedInstructorId);
  }, [instructors, selectedInstructorId]);

  // Dynamic Daily Report Rows derived from InstructorSchedule, PracticalAttendance, StudentEvaluation & ClassLogs
  const dynamicReportRows = useMemo(() => {
    const rows = weekDays.map((dayDate, idx) => {
      const dayDateStr = formatDateToLocalYYYYMMDD(dayDate);
      const displayFechaStr = dayDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const dayName = DAY_NAMES[idx];

      const daySchedules = schedules.filter(s => s.fecha && s.fecha.split('T')[0] === dayDateStr);
      const dayEvals = evaluationsList.filter(e => e.fecha && e.fecha.split('T')[0] === dayDateStr);
      const dayLogs = classLogs.filter(l => l.fecha && l.fecha.split('T')[0] === dayDateStr);

      if (daySchedules.length > 0 || dayEvals.length > 0 || dayLogs.length > 0) {
        let activitiesText = '';

        // Priority 1: Activity topics typed in "Clase Dada" modal
        if (dayLogs.length > 0) {
          const logTopics = dayLogs.map(l => l.tema_actividad?.trim()).filter(Boolean);
          const uniqueTopics = Array.from(new Set(logTopics));
          if (uniqueTopics.length > 0) {
            activitiesText = uniqueTopics.join('\n');
          }
        }

        // Priority 2: Evaluation phase / activity names
        if (!activitiesText && dayEvals.length > 0) {
          const rawActs = dayEvals.map(e => {
            const act = e.phase_nombre || e.activity_nombre || 'Práctica de Conducción';
            return act.trim();
          });

          const consecutiveUniqueActs: string[] = [];
          for (const act of rawActs) {
            if (!act) continue;
            if (consecutiveUniqueActs.length === 0 || consecutiveUniqueActs[consecutiveUniqueActs.length - 1] !== act) {
              consecutiveUniqueActs.push(act);
            }
          }

          activitiesText = consecutiveUniqueActs.join('\n');
        }

        if (!activitiesText) {
          activitiesText = 'Práctica de Conducción';
        }

        // Extract unique routes
        const routesList = Array.from(new Set(daySchedules.map(s => s.circuito_ruta).filter(Boolean)));
        const rutaText = routesList.length > 0 ? routesList.join('\n') : 'Circuito 1';

        // Check observations typed in "Clase Dada" or attendance status
        let obsText = '';
        if (dayLogs.length > 0) {
          const logNotes = dayLogs.map(l => l.observaciones?.trim()).filter(Boolean);
          const uniqueNotes = Array.from(new Set(logNotes));
          if (uniqueNotes.length > 0) {
            obsText = uniqueNotes.join('; ');
          }
        }

        const dayAtt = attendances.find(a => a.fecha && a.fecha.split('T')[0] === dayDateStr);
        if (dayAtt) {
          if (dayAtt.observacion) {
            obsText = obsText ? `${obsText} (${dayAtt.observacion})` : dayAtt.observacion;
          } else if (dayAtt.estado === 'RETRASO') {
            obsText = obsText ? `${obsText} (Retraso registrado)` : 'Retraso registrado';
          } else if (dayAtt.estado === 'AUSENTE') {
            obsText = 'Estudiante Ausente';
          }
        }

        if (!obsText) {
          obsText = 'Práctica realizada con normalidad';
        }

        return {
          fecha: displayFechaStr,
          dia: dayName,
          actividad: activitiesText,
          ruta: rutaText,
          observacion: obsText,
          hasClasses: true,
          vehiclePlaca: daySchedules[0]?.vehicle_placa || null,
          licenceType: (daySchedules[0] as any)?.student_tipo_licencia || daySchedules[0]?.tipo_licencia || 'C'
        };
      } else {
        return {
          fecha: displayFechaStr,
          dia: dayName,
          actividad: 'Sin clases prácticas programadas',
          ruta: '---',
          observacion: 'N/A',
          hasClasses: false,
          vehiclePlaca: null,
          licenceType: null
        };
      }
    });

    return rows;
  }, [weekDays, schedules, attendances, evaluationsList, classLogs]);

  // Auto-detect primary vehicle placa used in the week's classes
  const autoVehiclePlaca = useMemo(() => {
    const classRowWithVehicle = dynamicReportRows.find(r => r.vehiclePlaca);
    if (classRowWithVehicle?.vehiclePlaca) return classRowWithVehicle.vehiclePlaca;
    
    const selectedVehObj = vehicles.find(v => v.id.toString() === selectedVehicleId);
    if (selectedVehObj) return selectedVehObj.placa;
    
    return vehicles.length > 0 ? vehicles[0].placa : 'IBD 6067';
  }, [dynamicReportRows, vehicles, selectedVehicleId]);

  // Active Vehicle Object
  const activeVehicleObj = useMemo(() => {
    return vehicles.find(v => v.placa === autoVehiclePlaca) || vehicles[0];
  }, [vehicles, autoVehiclePlaca]);

  // Auto-detect licence types taught during the week
  const autoLicenceTypes = useMemo(() => {
    const types = Array.from(new Set(dynamicReportRows.map(r => r.licenceType).filter(Boolean)));
    return types.length > 0 ? types.join(' - ') : 'Licencia Tipo C';
  }, [dynamicReportRows]);

  // Header Title based on Licence Type (Tipo E vs Tipo C)
  const reportHeaderTitle = useMemo(() => {
    const isLicenceE = autoLicenceTypes.toUpperCase().includes('E');
    if (isLicenceE) {
      const vehType = activeVehicleObj?.tipo || activeVehicleObj?.clase || 'TRÁILER / TRACTOCAMIÓN';
      return `INFORME DE ACTIVIDADES SEMANALES DEL INSTRUCTOR DE PRÁCTICAS DE CONDUCCIÓN - VEHÍCULO TIPO ${vehType.toUpperCase()}`;
    }
    return 'INFORME DE ACTIVIDADES SEMANALES DEL INSTRUCTOR DE PRÁCTICAS DE CONDUCCIÓN';
  }, [autoLicenceTypes, activeVehicleObj]);

  // Name formatted for Elaborado Por
  const instructorFullName = useMemo(() => {
    if (selectedInstructorObj) {
      if (selectedInstructorObj.first_name || selectedInstructorObj.last_name) {
        return `${selectedInstructorObj.last_name} ${selectedInstructorObj.first_name}`.trim();
      }
      return selectedInstructorObj.username;
    }
    return authService.getUserName() || 'Instructor de Conducción';
  }, [selectedInstructorObj]);



  // Pure mathematical OKLCH & OKLAB to sRGB converter to guarantee html2canvas compatibility on all browsers
  const parseAndConvertOklch = (str: string | null | undefined): string => {
    if (!str || typeof str !== 'string') return str || '';
    if (!str.includes('oklch') && !str.includes('oklab') && !str.includes('color-mix')) return str;

    let cleaned = str.replace(/color-mix\([^)]+\)/gi, '#000000');

    const toSrgb = (x: number) => {
      const clamped = Math.max(0, Math.min(1, x));
      return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
    };

    const convertOklchMatch = (lStr: string, cStr: string, hStr: string, aStr?: string) => {
      let l = parseFloat(lStr);
      if (lStr.endsWith('%')) l /= 100;
      let c = parseFloat(cStr);
      if (cStr.endsWith('%')) c /= 100;
      let h = parseFloat(hStr);
      let alpha = aStr !== undefined ? parseFloat(aStr) : 1;
      if (aStr && aStr.endsWith('%')) alpha /= 100;

      const hRad = (h * Math.PI) / 180;
      const a = c * Math.cos(hRad);
      const b = c * Math.sin(hRad);

      const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

      const r = Math.round(toSrgb(rLin) * 255);
      const g = Math.round(toSrgb(gLin) * 255);
      const bVal = Math.round(toSrgb(bLin) * 255);

      return alpha < 1 ? `rgba(${r}, ${g}, ${bVal}, ${alpha})` : `rgb(${r}, ${g}, ${bVal})`;
    };

    const convertOklabMatch = (lStr: string, aStr: string, bStr: string, aAlphaStr?: string) => {
      let l = parseFloat(lStr);
      if (lStr.endsWith('%')) l /= 100;
      let a = parseFloat(aStr);
      let b = parseFloat(bStr);
      let alpha = aAlphaStr !== undefined ? parseFloat(aAlphaStr) : 1;
      if (aAlphaStr && aAlphaStr.endsWith('%')) alpha /= 100;

      const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

      const r = Math.round(toSrgb(rLin) * 255);
      const g = Math.round(toSrgb(gLin) * 255);
      const bVal = Math.round(toSrgb(bLin) * 255);

      return alpha < 1 ? `rgba(${r}, ${g}, ${bVal}, ${alpha})` : `rgb(${r}, ${g}, ${bVal})`;
    };

    cleaned = cleaned
      .replace(/oklch\(\s*([\d.%]+)\s+([\d.%]+)\s+([\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi, (_, l, c, h, a) => convertOklchMatch(l, c, h, a))
      .replace(/oklab\(\s*([\d.%]+)\s+([-\d.%]+)\s+([-\d.%]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi, (_, l, a, b, al) => convertOklabMatch(l, a, b, al));

    if (cleaned.includes('oklab') || cleaned.includes('oklch')) {
      cleaned = cleaned.replace(/(oklab|oklch)\([^)]+\)/gi, '#000000');
    }

    return cleaned;
  };

  // High Quality PDF Export Handler capturing exact frontend document with oklch math sanitization
  const handleExportPDF = async () => {
    if (!reportPaperRef.current) return;
    setExportingPDF(true);
    const toastId = toast.loading('Generando documento PDF oficial...');

    try {
      const sourcePaper = reportPaperRef.current;

      const canvas = await html2canvas(sourcePaper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc, element) => {
          // 1. Remove all existing <style> and <link> elements to eliminate Tailwind CSS rules containing oklab/oklch
          const styleEls = Array.from(clonedDoc.querySelectorAll('style, link[rel="stylesheet"]'));
          styleEls.forEach(el => el.remove());

          // 2. Inject a clean CSS reset into clonedDoc.head
          const cleanStyle = clonedDoc.createElement('style');
          cleanStyle.textContent = `
            * { box-sizing: border-box !important; }
            body { background: #ffffff !important; color: #111827 !important; font-family: system-ui, -apple-system, sans-serif !important; }
          `;
          clonedDoc.head.appendChild(cleanStyle);

          // 3. Explicitly copy computed inline styles from source paper to cloned elements, converting any oklab/oklch
          const sourceEls = Array.from(sourcePaper.querySelectorAll('*')) as HTMLElement[];
          const clonedEls = Array.from(element.querySelectorAll('*')) as HTMLElement[];

          const propsToCopy: (keyof CSSStyleDeclaration)[] = [
            'backgroundColor', 'color', 'borderColor', 'borderStyle', 'borderWidth',
            'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
            'display', 'flexDirection', 'justifyContent', 'alignItems', 'gridTemplateColumns',
            'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
            'fontSize', 'fontWeight', 'textAlign', 'textTransform', 'width', 'height',
            'maxWidth', 'maxHeight', 'boxSizing', 'borderRadius'
          ];

          const rootComp = window.getComputedStyle(sourcePaper);
          propsToCopy.forEach(prop => {
            let val = rootComp[prop];
            if (val && typeof val === 'string') {
              val = parseAndConvertOklch(val);
              (element.style as any)[prop] = val;
            }
          });
          element.style.boxShadow = 'none';

          for (let i = 0; i < sourceEls.length; i++) {
            const src = sourceEls[i];
            const dest = clonedEls[i];
            if (src && dest) {
              const comp = window.getComputedStyle(src);
              propsToCopy.forEach(prop => {
                let val = comp[prop];
                if (val && typeof val === 'string') {
                  val = parseAndConvertOklch(val);
                  (dest.style as any)[prop] = val;
                }
              });
              dest.style.boxShadow = 'none';
            }
          }

          // 4. Final safety pass on any inline style property
          const allCloned = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
          allCloned.forEach((el) => {
            if (el.style) {
              el.style.boxShadow = 'none';
              for (let i = el.style.length - 1; i >= 0; i--) {
                const propName = el.style[i];
                const val = el.style.getPropertyValue(propName);
                if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color('))) {
                  el.style.setProperty(propName, parseAndConvertOklch(val), 'important');
                }
              }
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');

      // Create A4 Portrait PDF (210mm x 297mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;

      const margin = 6; // 6mm margin
      const maxWidth = pdfWidth - margin * 2; // 198mm
      const maxHeight = pdfHeight - margin * 2; // 285mm

      let renderWidth = maxWidth;
      let renderHeight = (canvas.height * renderWidth) / canvas.width;

      if (renderHeight > maxHeight) {
        renderHeight = maxHeight;
        renderWidth = (canvas.width * renderHeight) / canvas.height;
      }

      const xOffset = (pdfWidth - renderWidth) / 2;
      const yOffset = (pdfHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);

      const cleanName = instructorFullName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Informe_Semanal_Semana_${weekNumber}_${cleanName}.pdf`;
      pdf.save(fileName);

      toast.success('Documento PDF vertical generado y descargado con éxito', { id: toastId });
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      toast.error(`Error al generar PDF: ${err?.message || 'Error inesperado'}`, { id: toastId });
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-emerald-800 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-black uppercase tracking-wider">Cargando módulo de informes automatizados...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto pb-32 font-sans">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs tracking-wider uppercase mb-1">
            <FileText className="w-4 h-4" /> Módulo de Informes Automatizados
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Informe Semanal del Instructor
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
            Generación oficial de reportes autollenados con clases reales, rutas y las 3 firmas institucionales.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-blue-700 text-white rounded-2xl font-bold text-xs hover:bg-blue-800 transition-all shadow-md shadow-blue-700/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            {exportingPDF ? 'Generando...' : 'Descargar PDF'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {/* Interactive Control Banner (Week Navigator & Instructor Selector) */}
      <div className="mb-8 bg-emerald-900 text-white p-5 rounded-3xl shadow-md border border-emerald-800 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Week Info & Navigator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
              <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">Semana Nº {weekNumber}:</span>
              <span className="text-sm font-black text-white">{weekRangeText}</span>
            </div>

            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl border border-white/15">
              <button
                type="button"
                onClick={() => changeWeek(-1)}
                className="p-2 hover:bg-white/20 text-white rounded-xl transition-all"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetToToday}
                className="px-3 py-1 text-xs font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-xs"
              >
                Semana Actual
              </button>
              <button
                type="button"
                onClick={() => changeWeek(1)}
                className="p-2 hover:bg-white/20 text-white rounded-xl transition-all"
                title="Semana Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Instructor Dropdown Filter (Locked for Instructors, Open for Admins) */}
          {isAdmin ? (
            <div className="w-full lg:w-72">
              <label className="block text-[10px] font-black uppercase text-emerald-300 tracking-wider mb-1">
                Filtrar Instructor (Vista Admin):
              </label>
              <select
                value={selectedInstructorId}
                onChange={e => setSelectedInstructorId(e.target.value)}
                className="w-full bg-white text-gray-900 text-xs font-black py-2.5 px-3 rounded-2xl border border-emerald-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.first_name || inst.last_name ? `${inst.last_name} ${inst.first_name}`.trim() : inst.username}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="w-full lg:w-72">
              <span className="block text-[10px] font-black uppercase text-emerald-300 tracking-wider mb-1">
                Instructor Autenticado:
              </span>
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/20 text-xs font-black text-white flex items-center justify-between">
                <span>{instructorFullName}</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-md">Mi Perfil</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Official Document Paper Preview (Identical to Official Word Document - Portrait Format) */}
      <div 
        ref={reportPaperRef}
        className="printable-paper bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* Document Header with Institutional Logo */}
        <div className="flex items-center justify-between border-b-2 border-gray-900 pb-3 mb-4">
          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
            <img src={logoUrl} alt="Logo Sindicato" className="max-h-full max-w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div className="text-center flex-1 px-4">
            <h2 className="text-base font-black tracking-wide uppercase text-gray-900">
              SINDICATO DE CHOFERES PROFESIONALES DEL CANTÓN ESPEJO
            </h2>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase text-gray-800 mt-0.5">
              {reportHeaderTitle}
            </h3>
          </div>
          <div className="w-16 h-16 shrink-0 hidden sm:block" />
        </div>

        {/* Datos Informativos Table */}
        <div className="mb-4 border-2 border-gray-900 text-xs font-bold text-gray-900">
          <div className="grid grid-cols-3 border-b border-gray-900 p-2 bg-gray-50">
            <div><span className="font-extrabold">Nombre del Instructor:</span> {instructorFullName}</div>
            <div><span className="font-extrabold">Período académico:</span> 2025-2026</div>
            <div><span className="font-extrabold">Licencia profesional tipo:</span> {autoLicenceTypes}</div>
          </div>
          <div className="grid grid-cols-2 p-2">
            <div>
              <span className="font-extrabold">Semana Nº {weekNumber}:</span> {weekRangeText}
            </div>
            <div><span className="font-extrabold">Placa del vehículo:</span> {autoVehiclePlaca}</div>
          </div>
        </div>

        {/* Table 2: Daily Activities (100% Dynamically Auto-Populated) */}
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-xs border-2 border-gray-900 text-left">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-gray-900 text-gray-900 font-black uppercase text-[11px]">
                <th className="p-2 border-r border-gray-900 w-28">Fecha</th>
                <th className="p-2 border-r border-gray-900 w-24">Día</th>
                <th className="p-2 border-r border-gray-900">Actividades Desarrolladas</th>
                <th className="p-2 border-r border-gray-900 w-44">Ruta / Lugar</th>
                <th className="p-2 w-48">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y border-gray-900 font-semibold text-gray-800">
              {dynamicReportRows.map((row, idx) => (
                <tr key={idx} className={`border-b border-gray-900 ${row.hasClasses ? 'hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'}`}>
                  <td className="p-1.5 px-2 border-r border-gray-900 font-bold">{row.fecha}</td>
                  <td className="p-1.5 px-2 border-r border-gray-900 font-bold">{row.dia}</td>
                  <td className="p-1.5 px-2 border-r border-gray-900 whitespace-pre-line">{row.actividad}</td>
                  <td className="p-1.5 px-2 border-r border-gray-900 font-bold text-emerald-900 whitespace-pre-line">{row.ruta}</td>
                  <td className="p-1.5 px-2 font-medium">{row.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures Section (3 Official Signatures) */}
        <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs font-bold text-gray-900">
          <div className="border-t border-gray-900 pt-2">
            <p className="font-extrabold uppercase">Elaborado por:</p>
            <p className="text-[11px] text-gray-800 font-black mt-0.5">{instructorFullName}</p>
            <p className="text-[10px] text-gray-600 font-bold uppercase mt-0.5">INSTRUCTOR DE CONDUCCIÓN</p>
            <p className="text-[9px] text-gray-400 mt-4">Firma: ………………………………………………………</p>
          </div>

          <div className="border-t border-gray-900 pt-2">
            <p className="font-extrabold uppercase">Revisado por:</p>
            <p className="text-[11px] text-gray-800 font-black mt-0.5">Javier Godoy</p>
            <p className="text-[10px] text-gray-600 font-bold uppercase mt-0.5">INSPECTOR GENERAL</p>
            <p className="text-[9px] text-gray-400 mt-4">Firma: ………………………………………………………</p>
          </div>

          <div className="border-t border-gray-900 pt-2">
            <p className="font-extrabold uppercase">Aprobado por:</p>
            <p className="text-[11px] text-gray-800 font-black mt-0.5">Germania Paguay</p>
            <p className="text-[10px] text-gray-600 font-bold uppercase mt-0.5">DIRECTOR PEDAGÓGICO</p>
            <p className="text-[9px] text-gray-400 mt-4">Firma: ………………………………………………………</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorWeeklyReportView;
