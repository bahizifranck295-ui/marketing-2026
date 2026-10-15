import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, CompanySettings, Employee } from '../types';
import { drawLetterhead } from './letterhead';

export const exportToExcel = (data: any[], fileName: string, sheetName = 'Présences') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Set auto column width
  const maxProps = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(d => String(d[key] ?? '').length)) + 2
  }));
  worksheet['!cols'] = maxProps;

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const generateAttendancePdf = (
  title: string,
  records: AttendanceRecord[],
  company: CompanySettings,
  subtitle?: string
) => {
  const doc = new jsPDF('landscape');

  // En-tête officiel PREMIDIS SARL
  const top = drawLetterhead(doc);

  // Title of report
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 35, 59);
  doc.text(title.toUpperCase(), 14, top + 8);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 119, 135);
    doc.text(subtitle, 14, top + 14);
  }

  // Statistics Summary
  const total = records.length;
  const present = records.filter(r => r.status === 'PRESENT').length;
  const retard = records.filter(r => r.status === 'RETARD').length;
  const absent = records.filter(r => r.status === 'ABSENT').length;
  const totalLateMin = records.reduce((sum, r) => sum + r.lateMinutes, 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total : ${total} | Présents : ${present} | Retards : ${retard} (${totalLateMin} min cumulées) | Absents : ${absent}`, 14, top + 21);

  // Table body
  const tableData = records.map((r, i) => [
    (i + 1).toString(),
    r.employeeId,
    r.employeeName,
    r.department,
    r.date,
    r.expectedCheckIn || '08:30',
    r.actualCheckIn || '–',
    r.lateMinutes > 0 ? `+${r.lateMinutes} min` : '0 min',
    r.actualCheckOut || '–',
    r.status === 'PRESENT' ? 'P (Présent)' : r.status === 'RETARD' ? 'R (Retard)' : 'A (Absent)',
    r.notes || (r.isCorrected ? `Corrigé (${r.correctionReason || ''})` : '–')
  ]);

  autoTable(doc, {
    startY: top + 26,
    head: [['N°', 'Matricule', 'Nom & Postnom', 'Département', 'Date', 'Entrée Prévue', 'Entrée Réelle', 'Retard', 'Sortie', 'Statut', 'Observations']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [20, 35, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { cellWidth: 40 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 20, halign: 'center' },
      8: { cellWidth: 20, halign: 'center' },
      9: { cellWidth: 25, halign: 'center' },
      10: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 9) {
        const val = String(data.cell.raw);
        if (val.includes('Présent')) {
          data.cell.styles.textColor = [22, 163, 74]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('Retard')) {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('Absent')) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Page numbering
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`PREMIDIS Attendance – Document officiel | Page ${i} sur ${pageCount} | Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 202);
  }

  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().substring(0, 10)}.pdf`);
};

export interface MonthlyGridRow {
  number: number;
  employee: Employee;
  days: Record<number, AttendanceRecord | null>;
  totalP: number;
  totalR: number;
  totalA: number;
  totalLateMin: number;
}

export const generateEmployeesPdf = (employees: Employee[], company: CompanySettings) => {
  const doc = new jsPDF('landscape');

  // En-tête officiel PREMIDIS SARL
  const top = drawLetterhead(doc);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 35, 59);
  doc.text(`REGISTRE GÉNÉRAL DU PERSONNEL (EFFECTIF : ${employees.length})`, 14, top + 8);

  const tableData = employees.map((e, idx) => [
    (idx + 1).toString(),
    '',
    e.matricule,
    `${e.nom} ${e.postnom} ${e.prenom}`,
    e.departement,
    e.poste,
    e.dateEmbauche,
    `${e.heureEntreeNormale} - ${e.heureSortieNormale}`,
    `ID ${e.zktecoBioId}`,
    e.telephone,
    e.statutAdministratif
  ]);

  autoTable(doc, {
    startY: top + 13,
    head: [['N°', 'Photo', 'Matricule', 'Nom Complet', 'Département', 'Poste / Fonction', 'Embauche', 'Horaires', 'ID ZKTeco', 'Téléphone', 'Statut']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [20, 35, 59],
      textColor: [255, 255, 255],
      fontSize: 8
    },
    bodyStyles: { fontSize: 8, minCellHeight: 13, valign: 'middle' },
    columnStyles: { 1: { cellWidth: 15 } },
    // Photo de l'employé dans la colonne « Photo »
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 1) return;
      const photo = employees[data.row.index]?.photoUrl;
      if (!photo) return;
      const size = Math.min(data.cell.width, data.cell.height) - 2;
      try {
        doc.addImage(photo, 'JPEG', data.cell.x + (data.cell.width - size) / 2, data.cell.y + 1, size, size);
      } catch { /* image illisible : la cellule reste vide */ }
    }
  });

  doc.save(`Registre_Personnel_PREMIDIS_${new Date().toISOString().substring(0, 10)}.pdf`);
};

export interface SanctionPdfRow {
  matricule: string;
  employeeName: string;
  department: string;
  lateCount: number;
  totalMinutesLate: number;
  absenceCount: number;
  proposedSanction: string;
  deductionAmount: number;
  currency: string;
  status: string;
  decisionDate: string | null;
  decidedBy: string | null;
  decisionMotif?: string;
}
