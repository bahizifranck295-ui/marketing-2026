import React, { useState, useMemo, useRef, useEffect } from 'react';
import { exportPreviewToPdf } from '../../utils/previewPdf';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import { AttendanceRecord, AttendanceStatus, Employee, SANCTION_LABELS } from '../../types';
import { evaluateSanctions, sanctionText } from '../../utils/sanctions';
import { FileText, Calendar, AlertOctagon } from 'lucide-react';
import { Letterhead } from '../common/Letterhead';
import { StatusBadge, CodeBadge } from '../common/Badge';

/** Document prérempli, exporté depuis un autre écran (ex. le carnet mensuel) sans quitter cet écran */
export interface ReportPreset {
  period: 'JOUR' | 'MOIS';
  month?: string;
  date?: string;
  department?: string;
  status?: 'ALL' | AttendanceStatus;
}

/** Ligne de la synthèse mensuelle (grille J1-J31) */
interface MonthlyGridRow {
  number: number;
  employee: Employee;
  days: Record<number, AttendanceRecord | null>;
  totalP: number;
  totalR: number;
  totalA: number;
  totalLateMin: number;
}

/** Ligne du rapport mensuel des sanctions */
interface SanctionPdfRow {
  matricule: string;
  employeeName: string;
  department: string;
  lateCount: number;
  totalMinutesLate: number;
  absenceCount: number;
  proposedSanction: string;
  ruleName: string;
  deductionAmount: number;
  currency: string;
  status: string;
  decisionDate: string | null;
  decidedBy: string | null;
  decisionMotif?: string;
}

export const ReportsView: React.FC<{
  preset?: ReportPreset;
  /** Appelé une fois le document affiché : élément de l'aperçu et titre du rapport */
  onDocumentReady?: (el: HTMLDivElement, title: string) => void;
}> = ({ preset, onDocumentReady }) => {
  const { attendanceRecords, employees, departments, sanctionCases, sanctionRules, workingDate, reportTab, reportMonth, can } = useApp();

  // Tab: 'ATTENDANCE' (Rapports de présence) vs 'SANCTIONS' (Sanctions disciplinaires mensuelles)
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'SANCTIONS'>(preset ? 'ATTENDANCE' : reportTab);
  
  // Period mode for attendance: 'JOUR' or 'MOIS'
  const [periodType, setPeriodType] = useState<'JOUR' | 'MOIS'>(preset?.period ?? 'JOUR');
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(preset?.date ?? workingDate);
  const [selectedMonth, setSelectedMonth] = useState(preset?.month ?? reportMonth ?? workingDate.slice(0, 7));
  const [selectedDepartment, setSelectedDepartment] = useState(preset?.department ?? 'ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | AttendanceStatus>(preset?.status ?? 'ALL');

  const isDaily = periodType === 'JOUR';

  // Days count in selected month (e.g., 31 for October, 30 for November)
  const daysInMonth = useMemo(() => {
    const [yearNum, monthNum] = selectedMonth.split('-').map(Number);
    return new Date(yearNum, monthNum, 0).getDate();
  }, [selectedMonth]);

  // Title calculation based on period + status filter
  const dynamicReportTitle = useMemo(() => {
    if (activeTab === 'SANCTIONS') {
      const monthLabel = new Date(`${selectedMonth}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const capMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
      return `Rapport Mensuel des Sanctions Disciplinaires – ${capMonth}`;
    }

    if (!isDaily) {
      if (selectedStatus === 'RETARD') {
        return `Carnet Mensuel des Retards (J1 - J${daysInMonth}) – ${selectedMonth}`;
      }
      if (selectedStatus === 'ABSENT') {
        return `Carnet Mensuel des Absences (J1 - J${daysInMonth}) – ${selectedMonth}`;
      }
      if (selectedStatus === 'PRESENT') {
        return `Carnet Mensuel des Présences (J1 - J${daysInMonth}) – ${selectedMonth}`;
      }
      return `Feuille de Synthèse Mensuelle des Présences (Carnet J1-J${daysInMonth}) – ${selectedMonth}`;
    }

    if (selectedStatus === 'RETARD') {
      return `Relevé des Retards Constatés – ${selectedDate}`;
    }
    if (selectedStatus === 'ABSENT') {
      return `Relevé des Absences Constatées – ${selectedDate}`;
    }
    if (selectedStatus === 'PRESENT') {
      return `Relevé des Présences Ponctuelles – ${selectedDate}`;
    }

    return `Relevé Quotidien des Pointages & Présences – ${selectedDate}`;
  }, [activeTab, selectedStatus, isDaily, selectedDate, selectedMonth, daysInMonth]);

  // Filtered attendance data based on all criteria (for daily view)
  const filteredAttendanceData = useMemo(() => {
    if (activeTab === 'SANCTIONS') return [];

    return attendanceRecords.filter(r => {
      // Department filter
      if (selectedDepartment !== 'ALL' && r.department !== selectedDepartment) return false;
      
      // Employee filter
      if (selectedEmployeeId !== 'ALL' && r.employeeId !== selectedEmployeeId) return false;

      // Status filter (aligns directly without duplicate fields)
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;

      // Period filter
      if (isDaily) {
        return r.date === selectedDate;
      }

      // Monthly / period
      return r.date.startsWith(selectedMonth);
    });
  }, [attendanceRecords, activeTab, isDaily, selectedDate, selectedMonth, selectedDepartment, selectedEmployeeId, selectedStatus]);

  // Statistics for daily attendance
  const attendanceStats = useMemo(() => {
    const total = filteredAttendanceData.length;
    const presents = filteredAttendanceData.filter(r => r.status === 'PRESENT').length;
    const retards = filteredAttendanceData.filter(r => r.status === 'RETARD').length;
    const absents = filteredAttendanceData.filter(r => r.status === 'ABSENT').length;
    const totalLateMin = filteredAttendanceData.reduce((sum, r) => sum + r.lateMinutes, 0);
    return { total, presents, retards, absents, totalLateMin };
  }, [filteredAttendanceData]);

  // Monthly synthesis grid data (J1 to J31) matching AttendanceView's monthly synthesis
  const monthlySynthesis = useMemo<MonthlyGridRow[]>(() => {
    if (activeTab !== 'ATTENDANCE' || isDaily) return [];

    const monthPrefix = selectedMonth;

    return employees.map((emp, index) => {
      const empRecords = attendanceRecords.filter(
        r => r.employeeId === emp.matricule && r.date.startsWith(monthPrefix)
      );

      const daysMap: Record<number, AttendanceRecord | null> = {};
      let totalP = 0;
      let totalR = 0;
      let totalA = 0;
      let totalLateMin = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
        const rec = empRecords.find(r => r.date === dateStr) || null;
        daysMap[day] = rec;

        if (rec) {
          if (rec.status === 'PRESENT') totalP++;
          else if (rec.status === 'RETARD') {
            totalR++;
            totalLateMin += rec.lateMinutes;
          } else if (rec.status === 'ABSENT') {
            totalA++;
          }
        }
      }

      return {
        number: index + 1,
        employee: emp,
        days: daysMap,
        totalP,
        totalR,
        totalA,
        totalLateMin
      };
    }).filter(row => {
      const matchDep = selectedDepartment === 'ALL' || row.employee.departement === selectedDepartment;
      const matchEmp = selectedEmployeeId === 'ALL' || row.employee.matricule === selectedEmployeeId;
      const matchStatus = selectedStatus === 'ALL' ||
        (selectedStatus === 'PRESENT' && row.totalP > 0) ||
        (selectedStatus === 'RETARD' && row.totalR > 0) ||
        (selectedStatus === 'ABSENT' && row.totalA > 0);
      return matchDep && matchEmp && matchStatus;
    });
  }, [activeTab, isDaily, employees, attendanceRecords, selectedMonth, daysInMonth, selectedDepartment, selectedEmployeeId, selectedStatus]);

  // Statistics for monthly synthesis
  const monthlyStats = useMemo(() => {
    const totalListed = monthlySynthesis.length;
    const grandP = monthlySynthesis.reduce((a, b) => a + b.totalP, 0);
    const grandR = monthlySynthesis.reduce((a, b) => a + b.totalR, 0);
    const grandA = monthlySynthesis.reduce((a, b) => a + b.totalA, 0);
    const grandLateMin = monthlySynthesis.reduce((a, b) => a + b.totalLateMin, 0);
    return { totalListed, grandP, grandR, grandA, grandLateMin };
  }, [monthlySynthesis]);

  // Sanctions du mois : même calcul que le tableau de bord et le module Sanctions (barèmes actifs)
  const monthlySanctionsData: SanctionPdfRow[] = useMemo(() => {
    if (activeTab !== 'SANCTIONS') return [];
    return evaluateSanctions(employees, attendanceRecords, sanctionRules, selectedMonth, undefined, sanctionCases)
      .filter(p => selectedDepartment === 'ALL' || p.emp.departement === selectedDepartment)
      .filter(p => selectedEmployeeId === 'ALL' || p.emp.matricule === selectedEmployeeId)
      .map(({ emp, lateCount, lateMinutes, absences, rule, decision }) => ({
        matricule: emp.matricule,
        employeeName: `${emp.nom} ${emp.postnom} ${emp.prenom}`,
        department: emp.departement,
        lateCount,
        totalMinutesLate: lateMinutes,
        absenceCount: absences,
        proposedSanction: sanctionText(rule, SANCTION_LABELS),
        ruleName: rule.name,
        deductionAmount: decision?.status === 'REJETEE' ? 0 : rule.deductionAmount,
        currency: rule.currency,
        status: decision?.status ?? 'PROPOSEE',
        decisionDate: decision?.decisionDate ?? null,
        decidedBy: decision?.decidedBy ?? null,
        decisionMotif: decision
          ? `${decision.status === 'APPROUVEE' ? 'Validée' : 'Rejetée'} le ${decision.decisionDate} par ${decision.decidedBy}${decision.decisionMotif ? ` — ${decision.decisionMotif}` : ''}`
          : `En attente de la Direction · ${rule.name}`,
      }));
  }, [activeTab, employees, attendanceRecords, sanctionRules, sanctionCases, selectedMonth, selectedDepartment, selectedEmployeeId]);

  // Le PDF reprend exactement l'aperçu affiché ci-dessous (en-tête, titre, bilan et tableau)
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const readyNotified = useRef(false);
  useEffect(() => {
    if (!onDocumentReady || readyNotified.current || !previewRef.current) return;
    readyNotified.current = true;
    onDocumentReady(previewRef.current, dynamicReportTitle);
  });
  const handleExportPdf = async () => {
    if (!previewRef.current || exporting) return;
    setExporting(true);
    try {
      await exportPreviewToPdf(previewRef.current, dynamicReportTitle);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar with ONLY the Download PDF button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Rapports & Documents Officiels
          </h1>
          <p className="text-xs text-muted mt-1">
            Génération et exportation au format PDF des relevés de présences et des sanctions disciplinaires mensuelles
          </p>
        </div>

        {/* Action button: ONLY Télécharger PDF */}
        <div className="flex items-center gap-2.5">
          {can('reports', 'export') && <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold shadow-xs transition-colors disabled:opacity-60"
            title="Télécharger le rapport officiel au format PDF"
          >
            <FileText className="w-4 h-4" />
            <span>{exporting ? 'Préparation du PDF…' : 'Télécharger PDF'}</span>
          </button>}
        </div>
      </div>

      {/* DISTINCT TABS: PRÉSENCE VS SANCTIONS DISCIPLINAIRES MENSUELLES */}
      <div className="p-1 bg-slate-100 rounded-2xl inline-flex text-xs font-bold shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'bg-white text-brand shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-brand" />
          <span>Rapports de Présence & Pointages</span>
        </button>

        {/* DISTINCT TAB FOR MONTHLY DISCIPLINARY SANCTIONS */}
        <button
          type="button"
          onClick={() => setActiveTab('SANCTIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'SANCTIONS'
              ? 'bg-rose-50 text-rose-700 shadow-xs'
              : 'text-slate-600 hover:text-rose-600'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>Sanctions Disciplinaires Mensuelles</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
            {monthlySanctionsData.length}
          </span>
        </button>
      </div>

      {/* CONFIGURATION & FILTERING PANEL */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        {/* TAB 2: MONTHLY SANCTIONS DISTINCT HEADER BANNER */}
        {activeTab === 'SANCTIONS' && (
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-rose-900">
                  Rapport Mensuel des Sanctions Disciplinaires & Retenues Financières
                </p>
                <p className="text-[11px] text-rose-700/80">
                  Période mensuelle : <b className="font-mono">{selectedMonth}</b> · Cumul des manquements non justifiés et retenues soumises à la Direction Générale
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700">
              {monthlySanctionsData.length} dossiers pour {selectedMonth}
            </span>
          </div>
        )}

        {/* FILTERS BAR: PERIOD + DEPARTMENT + EMPLOYEE + STATUS (WITHOUT REDUNDANCY) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Period Selector (Day or Month toggle for attendance, Month for sanctions) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-500 font-bold">
                {activeTab === 'SANCTIONS' ? 'Mois sélectionné' : 'Période concernée'}
              </label>
              {activeTab === 'ATTENDANCE' && (
                <div className="flex text-[10px] font-bold bg-slate-200 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setPeriodType('JOUR')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      periodType === 'JOUR'
                        ? 'bg-white text-brand shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Jour
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('MOIS')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      periodType === 'MOIS'
                        ? 'bg-white text-brand shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Mois
                  </button>
                </div>
              )}
            </div>
            {activeTab === 'SANCTIONS' || !isDaily ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono font-bold text-slate-900 outline-none cursor-pointer"
              />
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono font-bold text-slate-900 outline-none cursor-pointer"
              />
            )}
          </div>

          {/* 2. Department Filter */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">Département</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-medium text-slate-900 outline-none cursor-pointer"
            >
              <option value="ALL">Tous les départements</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Employee Filter */}
          <div>
            <label className="block text-slate-500 font-bold mb-1">Employé spécifique</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-medium text-slate-900 outline-none cursor-pointer truncate"
            >
              <option value="ALL">Tout le personnel</option>
              {employees.map(e => (
                <option key={e.id} value={e.matricule}>{e.matricule} - {e.nom} {e.prenom}</option>
              ))}
            </select>
          </div>

          {/* 4. Filtre par statut (présences uniquement) */}
          {activeTab === 'ATTENDANCE' ? (
            <div>
              <label className="block text-slate-500 font-bold mb-1">
                Filtre par Statut
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-900 outline-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PRESENT">🟢 Présent (P)</option>
                <option value="RETARD">🟠 Retard (R)</option>
                <option value="ABSENT">🔴 Absent (A)</option>
              </select>
            </div>
          ) : null}
        </div>
      </div>

      {/* DOCUMENT PREVIEW CARD (A4 Print Preview Layout) */}
      <div ref={previewRef} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 bg-white shadow-md">
        {/* En-tête officiel PREMIDIS SARL */}
        <div className="-mx-2 sm:-mx-4 rounded-xl overflow-hidden bg-white">
          <Letterhead />
        </div>

        {/* Références du document */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-slate-800 text-xs">
          <span className="font-bold uppercase tracking-wider text-brand">
            Document Administratif Officiel
          </span>
          <span className="font-mono text-slate-500">
            Émis le : {new Date().toLocaleDateString('fr-FR')}
          </span>
          <span className="font-bold text-slate-800">
            Réf : PREMIDIS/RH/ATT/{selectedMonth.replace('-', '')}
          </span>
        </div>

        {/* Document Title Banner */}
        <div className="text-center py-2.5 bg-slate-50 rounded-xl space-y-0.5">
          <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
            {dynamicReportTitle}
          </h2>
          <p className="text-xs text-slate-500">
            Période : {activeTab === 'SANCTIONS' || !isDaily ? selectedMonth : selectedDate} · Service : {selectedDepartment === 'ALL' ? 'Tous départements' : selectedDepartment}
            {activeTab === 'ATTENDANCE' && selectedStatus !== 'ALL' && ` · Statut : ${selectedStatus}`}
          </p>
        </div>

        {/* Statistical Summary Bar */}
        {activeTab === 'SANCTIONS' && (
          <div className="flex flex-wrap items-center justify-between text-xs font-bold px-4 py-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
            <span className="text-rose-900 font-extrabold">
              Dossiers à sanctionner : {monthlySanctionsData.length}
            </span>
            <span className="text-slate-700">
              Sommes retirables : {monthlySanctionsData.reduce((a, b) => a + b.deductionAmount, 0)} USD
            </span>
          </div>
        )}
        {activeTab === 'ATTENDANCE' && !isDaily && (
          <div className="flex flex-wrap items-center justify-between text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-100">
            <span className="text-slate-700">Effectif listé : {monthlyStats.totalListed}</span>
            <span className="text-emerald-700">Total Présences (P) : {monthlyStats.grandP}</span>
            <span className="text-amber-700">Total Retards (R) : {monthlyStats.grandR} ({monthlyStats.grandLateMin} min)</span>
            <span className="text-rose-700">Total Absents (A) : {monthlyStats.grandA}</span>
          </div>
        )}

        {activeTab === 'ATTENDANCE' && isDaily && (
          <div className="flex flex-wrap items-center justify-between text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-100">
            <span className="text-slate-700">Total lignes : {attendanceStats.total}</span>
            <span className="text-emerald-700">Présents : {attendanceStats.presents}</span>
            <span className="text-amber-700">Retards : {attendanceStats.retards} ({attendanceStats.totalLateMin} min)</span>
            <span className="text-rose-700">Absents : {attendanceStats.absents}</span>
          </div>
        )}

        {/* Live Table Preview */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {activeTab === 'SANCTIONS' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#781432] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3">N°</th>
                  <th className="py-2.5 px-3">Matricule</th>
                  <th className="py-2.5 px-3">Collaborateur</th>
                  <th className="py-2.5 px-3">Département</th>
                  <th className="py-2.5 px-3 text-center">Retards (Min)</th>
                  <th className="py-2.5 px-3 text-center">Absences</th>
                  <th className="py-2.5 px-3">Sanction Statutaire</th>
                  <th className="py-2.5 px-3 text-center">Somme Retirable</th>
                  <th className="py-2.5 px-3">Observations / Visa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {monthlySanctionsData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      {`Aucun manquement ni dossier disciplinaire pour le mois de ${selectedMonth}.`}
                    </td>
                  </tr>
                ) : (
                  monthlySanctionsData.map((s, idx) => (
                    <tr key={s.matricule} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-brand">{s.matricule}</td>
                      <td className="py-2.5 px-3 font-bold"><span className="flex items-center gap-2"><EmployeeAvatar matricule={s.matricule} name={s.employeeName} size={28} />{s.employeeName}</span></td>
                      <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                        {s.lateCount > 0 ? `${s.lateCount} (${s.totalMinutesLate}m)` : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                        {s.absenceCount > 0 ? `${s.absenceCount} j` : '0'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {s.proposedSanction}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {s.deductionAmount > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            -{s.deductionAmount} {s.currency}
                          </span>
                        ) : (
                          <span className="text-slate-400">0 USD</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] min-w-[180px]">
                        {s.decisionMotif}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : !isDaily ? (
            /* EXACT MONTHLY SYNTHESIS CARNET J1-J31 GRID REPLICA FROM ATTENDANCE VIEW */
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    Carnet Mensuel des Présences (J1 à J{daysInMonth})
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    · {monthlySynthesis.length} collaborateur(s) listé(s)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5"><CodeBadge status="PRESENT" /> = Présent</span>
                  <span className="flex items-center gap-1.5"><CodeBadge status="RETARD" /> = Retard</span>
                  <span className="flex items-center gap-1.5"><CodeBadge status="ABSENT" /> = Absent</span>
                </div>
              </div>

              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-[#14233B] text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-2 text-center border-r border-slate-700 w-8">N°</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 min-w-[65px]">Matricule</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 min-w-[150px]">Nom & Postnom</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 min-w-[120px]">Département</th>
                    
                    {/* Days 1 to daysInMonth */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                      <th key={day} className="py-2 px-1 text-center border-r border-slate-700 min-w-[24px]">
                        {day}
                      </th>
                    ))}

                    {/* Monthly Summary Totals */}
                    <th className="py-2.5 px-2 text-center bg-emerald-900/60 border-r border-slate-700 text-emerald-200 min-w-[32px]" title="Total Présents">P</th>
                    <th className="py-2.5 px-2 text-center bg-amber-900/60 border-r border-slate-700 text-amber-200 min-w-[32px]" title="Total Retards">R</th>
                    <th className="py-2.5 px-2 text-center bg-rose-900/60 border-r border-slate-700 text-rose-200 min-w-[32px]" title="Total Absents">A</th>
                    <th className="py-2.5 px-2 text-center bg-slate-800 text-white min-w-[45px]" title="Retard cumulé en minutes">Min.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {monthlySynthesis.length === 0 ? (
                    <tr>
                      <td colSpan={4 + daysInMonth + 4} className="py-12 text-center text-slate-400">
                        Aucun employé trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    monthlySynthesis.map((row) => (
                      <tr key={row.employee.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200">
                          {row.number}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-brand border-r border-slate-200">
                          {row.employee.matricule}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 max-w-[190px]">
                          <span className="flex items-center gap-2 min-w-0"><EmployeeAvatar name={row.employee.nom} photoUrl={row.employee.photoUrl || ''} size={24} /><span className="truncate">{row.employee.nom} {row.employee.postnom} {row.employee.prenom}</span></span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 border-r border-slate-200 truncate max-w-[120px]">
                          {row.employee.departement}
                        </td>

                        {/* Day cells 1 to daysInMonth */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                          const rec = row.days[day];
                          if (!rec) {
                            return (
                              <td key={day} className="py-1 px-1 text-center border-r border-slate-200 text-slate-300">
                                ·
                              </td>
                            );
                          }

                          let bg = 'bg-emerald-500 text-white';
                          let char = 'P';
                          if (rec.status === 'RETARD') {
                            bg = 'bg-amber-500 text-white';
                            char = 'R';
                          } else if (rec.status === 'ABSENT') {
                            bg = 'bg-rose-500 text-white';
                            char = 'A';
                          }

                          return (
                            <td 
                              key={day} 
                              className="py-1 px-1 text-center border-r border-slate-200"
                              title={`J${day} : ${rec.status} (${rec.actualCheckIn || 'Non pointé'})`}
                            >
                              <span className={`inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold ${bg}`}>
                                {char}
                              </span>
                            </td>
                          );
                        })}

                        {/* Totals */}
                        <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50 border-r border-slate-200">
                          {row.totalP}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50 border-r border-slate-200">
                          {row.totalR}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50 border-r border-slate-200">
                          {row.totalA}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 bg-slate-50">
                          {row.totalLateMin}m
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14233B] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3">N°</th>
                  <th className="py-2.5 px-3">Matricule</th>
                  <th className="py-2.5 px-3">Nom & Postnom</th>
                  <th className="py-2.5 px-3">Département</th>
                  <th className="py-2.5 px-3 text-center">Date</th>
                  <th className="py-2.5 px-3 text-center">Entrée Constatée</th>
                  <th className="py-2.5 px-3 text-center">Retard (min)</th>
                  <th className="py-2.5 px-3 text-center">Statut (P / R / A)</th>
                  <th className="py-2.5 px-3">Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredAttendanceData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      Aucune donnée ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredAttendanceData.map((r, i) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-brand">{r.employeeId}</td>
                      <td className="py-2 px-3 font-bold"><span className="flex items-center gap-2"><EmployeeAvatar matricule={r.employeeId} name={r.employeeName} size={28} />{r.employeeName}</span></td>
                      <td className="py-2 px-3 text-slate-600">{r.department}</td>
                      <td className="py-2 px-3 text-center font-mono">{r.date}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{r.actualCheckIn || '–'}</td>
                      <td className="py-2 px-3 text-center font-mono">
                        {r.lateMinutes > 0 ? `+${r.lateMinutes} min` : '0 min'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="py-2 px-3 text-slate-500 min-w-[150px]">
                        {r.notes || (r.isCorrected ? `Ajusté (${r.correctionReason})` : '–')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
