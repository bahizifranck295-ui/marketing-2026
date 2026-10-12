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

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 14;
  if (finalY < 185) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 35, 59);
    doc.text('Pour le Secrétariat & Contrôle', 30, finalY);
    doc.text('Le Responsable des Ressources Humaines', 120, finalY);
    doc.text('Pour PREMIDIS SARL – La Direction Générale', 205, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('(Signature & Date)', 30, finalY + 15);
    doc.text('(Signature & Cachet)', 120, finalY + 15);
    doc.text('(Signature & Sceau officiel)', 205, finalY + 15);
  }

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

export const generateMonthlyGridPdf = (
  month: string,
  rows: MonthlyGridRow[],
  company: CompanySettings,
  subtitle?: string
) => {
  const doc = new jsPDF('landscape');
  const [yearNum, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const monthName = new Date(`${month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // En-tête officiel PREMIDIS SARL
  const top = drawLetterhead(doc);

  // Title of report
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 35, 59);
  doc.text(`CARNET DE SYNTHÈSE MENSUELLE DES PRÉSENCES (J1 - J${daysInMonth}) – ${capitalizedMonth.toUpperCase()}`, 14, top + 8);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 119, 135);
    doc.text(subtitle, 14, top + 14);
  }

  // Summary counts across all rows
  const totalEmployees = rows.length;
  const grandTotalP = rows.reduce((acc, r) => acc + r.totalP, 0);
  const grandTotalR = rows.reduce((acc, r) => acc + r.totalR, 0);
  const grandTotalA = rows.reduce((acc, r) => acc + r.totalA, 0);
  const grandTotalLateMin = rows.reduce((acc, r) => acc + r.totalLateMin, 0);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 35, 59);
  doc.text(`Effectif listé : ${totalEmployees} | Total Présences (P) : ${grandTotalP} | Retards (R) : ${grandTotalR} (${grandTotalLateMin} min) | Absences (A) : ${grandTotalA}`, 14, top + 20);

  // Table Headers: N°, Matricule, Nom, Dép, J1..J31, P, R, A, Min
  const headers = [
    'N°',
    'Matricule',
    'Nom & Postnom',
    'Dép.',
    ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
    'P',
    'R',
    'A',
    'Min'
  ];

  const tableData = rows.map((r, idx) => {
    const rowCells = [
      String(idx + 1),
      r.employee.matricule,
      `${r.employee.nom} ${r.employee.postnom || ''} ${r.employee.prenom || ''}`.trim(),
      r.employee.departement.substring(0, 12),
      ...Array.from({ length: daysInMonth }, (_, i) => {
        const rec = r.days[i + 1];
        if (!rec) return '·';
        return rec.status === 'PRESENT' ? 'P' : rec.status === 'RETARD' ? 'R' : 'A';
      }),
      String(r.totalP),
      String(r.totalR),
      String(r.totalA),
      `${r.totalLateMin}m`
    ];
    return rowCells;
  });

  autoTable(doc, {
    startY: top + 24,
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [20, 35, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 41, 59],
      halign: 'center',
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 15, halign: 'left' },
      2: { cellWidth: 32, halign: 'left' },
      3: { cellWidth: 18, halign: 'left' },
      [4 + daysInMonth]: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      [4 + daysInMonth + 1]: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      [4 + daysInMonth + 2]: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      [4 + daysInMonth + 3]: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const colIdx = data.column.index;
        if (colIdx >= 4 && colIdx < 4 + daysInMonth) {
          const val = String(data.cell.raw);
          if (val === 'P') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'R') {
            data.cell.styles.textColor = [217, 119, 6];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'A') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [160, 174, 192];
          }
        }
        if (colIdx === 4 + daysInMonth) {
          data.cell.styles.textColor = [22, 163, 74];
        }
        if (colIdx === 4 + daysInMonth + 1) {
          data.cell.styles.textColor = [217, 119, 6];
        }
        if (colIdx === 4 + daysInMonth + 2) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    }
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  if (finalY < 185) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 35, 59);
    doc.text('Le Contrôleur des Présences', 30, finalY);
    doc.text('Le Responsable des Ressources Humaines', 120, finalY);
    doc.text('Pour PREMIDIS SARL – La Direction Générale', 205, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('(Signature & Date)', 30, finalY + 12);
    doc.text('(Signature & Cachet RH)', 120, finalY + 12);
    doc.text('(Signature & Sceau Officiel)', 205, finalY + 12);
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`PREMIDIS Attendance – Carnet de Synthèse Mensuelle | Page ${i} sur ${pageCount} | Émis le ${new Date().toLocaleDateString('fr-FR')}`, 14, 202);
  }

  doc.save(`Synthese_Mensuelle_${month}_${new Date().toISOString().substring(0, 10)}.pdf`);
};

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
    head: [['N°', 'Matricule', 'Nom Complet', 'Département', 'Poste / Fonction', 'Embauche', 'Horaires', 'ID ZKTeco', 'Téléphone', 'Statut']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [20, 35, 59],
      textColor: [255, 255, 255],
      fontSize: 8
    },
    bodyStyles: { fontSize: 8 }
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

export const generateSanctionsPdf = (
  title: string,
  sanctions: SanctionPdfRow[],
  company: CompanySettings,
  subtitle?: string
) => {
  const doc = new jsPDF('landscape');

  // En-tête officiel PREMIDIS SARL
  const top = drawLetterhead(doc);

  // Title of report
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(190, 24, 93); // Rose/Crimson accent for disciplinary
  doc.text(title.toUpperCase(), 14, top + 8);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 119, 135);
    doc.text(subtitle, 14, top + 14);
  }

  // Summary counts
  const totalDossiers = sanctions.length;
  const totalDeductions = sanctions.reduce((acc, s) => acc + (s.status === 'APPROUVEE' || s.status === 'EN_EXAMEN' ? s.deductionAmount : 0), 0);
  const totalLates = sanctions.reduce((acc, s) => acc + s.lateCount, 0);
  const totalAbsences = sanctions.reduce((acc, s) => acc + s.absenceCount, 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 35, 59);
  doc.text(`Dossiers examinés : ${totalDossiers} | Retards cumulés : ${totalLates} | Absences non justifiées : ${totalAbsences} | Total retenues : ${totalDeductions} USD`, 14, top + 21);

  const tableData = sanctions.map((s, idx) => [
    (idx + 1).toString(),
    s.matricule,
    s.employeeName,
    s.department,
    s.lateCount > 0 ? `${s.lateCount} (${s.totalMinutesLate} min)` : '0',
    s.absenceCount > 0 ? `${s.absenceCount} jour(s)` : '0',
    s.proposedSanction.replace(/_/g, ' '),
    s.deductionAmount > 0 ? `-${s.deductionAmount} ${s.currency}` : '0 USD',
    s.status === 'APPROUVEE' && s.deductionAmount > 0 ? 'Encaissée sur paie' : s.status === 'APPROUVEE' ? 'Sanction notifiée' : s.status === 'REJETEE' ? 'Rejetée' : 'À prélever (En examen)',
    s.decisionMotif || (s.decisionDate ? `Visé le ${s.decisionDate}` : 'En attente avis DG')
  ]);

  autoTable(doc, {
    startY: top + 26,
    head: [['N°', 'Matricule', 'Collaborateur', 'Département', 'Retards (Min)', 'Absences', 'Sanction Statutaire', 'Somme Retirable', 'Statut / Encaissement', 'Motif & Observations']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [120, 20, 50],
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
      2: { cellWidth: 45 },
      3: { cellWidth: 35 },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 35 },
      7: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 22, halign: 'center' },
      9: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        data.cell.styles.textColor = [190, 24, 93];
      }
    }
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 14;
  if (finalY < 185) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 35, 59);
    doc.text('Le Responsable des Ressources Humaines', 40, finalY);
    doc.text('Pour PREMIDIS SARL – La Direction Générale', 190, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('(Signature & Cachet RH)', 40, finalY + 15);
    doc.text('(Signature & Sceau Officiel de Direction)', 190, finalY + 15);
  }

  // Page numbering
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`PREMIDIS Attendance – Rapport Disciplinaire Officiel | Page ${i} sur ${pageCount} | Émis le ${new Date().toLocaleDateString('fr-FR')}`, 14, 202);
  }

  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().substring(0, 10)}.pdf`);
};
