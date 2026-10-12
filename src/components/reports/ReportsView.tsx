import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceRecord, AttendanceStatus, Employee } from '../../types';
import { 
  FileText, Calendar, Users, Clock, AlertTriangle, 
  AlertOctagon, Filter, CheckCircle2, Building2
} from 'lucide-react';
import { 
  generateAttendancePdf, 
  generateSanctionsPdf, 
  generateMonthlyGridPdf,
  SanctionPdfRow,
  MonthlyGridRow
} from '../../utils/exportUtils';
import { Letterhead } from '../common/Letterhead';
import { StatusBadge, CodeBadge } from '../common/Badge';

export const ReportsView: React.FC = () => {
  const { attendanceRecords, employees, departments, companySettings, sanctionCases } = useApp();

  // Tab: 'ATTENDANCE' (Rapports de présence) vs 'SANCTIONS' (Sanctions disciplinaires mensuelles)
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'SANCTIONS'>('ATTENDANCE');
  
  // Period mode for attendance: 'JOUR' or 'MOIS'
  const [periodType, setPeriodType] = useState<'JOUR' | 'MOIS'>('JOUR');
  
  // Filters
  const [selectedDate, setSelectedDate] = useState('2026-10-11');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | AttendanceStatus>('ALL');
  const [sanctionFilterMode, setSanctionFilterMode] = useState<'ALL' | 'ENCAISSEE' | 'A_PRELEVER'>('ALL');

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
      if (sanctionFilterMode === 'ENCAISSEE') {
        return `Rapport des Sanctions Déjà Encaissées & Prélevées – ${capMonth}`;
      }
      if (sanctionFilterMode === 'A_PRELEVER') {
        return `Rapport des Sanctions en Cours d'Encaissement (À Prélever) – ${capMonth}`;
      }
      return `Rapport Mensuel des Sanctions Disciplinaires & Retenues Encaissées – ${capMonth}`;
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

  // Monthly Disciplinary Sanctions Data strictly based on selectedMonth
  const monthlySanctionsData: SanctionPdfRow[] = useMemo(() => {
    if (activeTab !== 'SANCTIONS') return [];

    const monthKey = selectedMonth; // e.g. "2026-10"
    const monthDate = new Date(`${selectedMonth}-01`);
    const monthName = monthDate.toLocaleDateString('fr-FR', { month: 'long' }).toLowerCase();
    const yearStr = selectedMonth.split('-')[0];

    return employees.map(emp => {
      const lateRecs = attendanceRecords.filter(r => r.employeeId === emp.matricule && r.date.startsWith(monthKey) && r.status === 'RETARD');
      const absenceRecs = attendanceRecords.filter(r => r.employeeId === emp.matricule && r.date.startsWith(monthKey) && r.status === 'ABSENT');

      const lateCount = lateRecs.length;
      const totalMinutesLate = lateRecs.reduce((sum, r) => sum + r.lateMinutes, 0);
      const absenceCount = absenceRecs.length;

      // Existing case if recorded in database/mock data matching selected period
      const existing = sanctionCases.find(s => {
        if (s.employeeId !== emp.matricule) return false;
        const p = (s.period || '').toLowerCase();
        return p.includes(monthKey) || (p.includes(monthName) && p.includes(yearStr));
      });

      let deductionAmount = existing ? (existing.approvedDeductionAmount ?? existing.deductionAmount) : 0;
      let sanctionType = existing ? existing.proposedSanction : 'AUCUNE';
      let status = existing ? existing.status : (lateCount >= 3 || absenceCount >= 1 ? 'PROPOSEE' : 'CONFORME');

      // Auto-evaluation based on enterprise rule threshold if case was not yet finalized
      if (!existing && (lateCount >= 3 || absenceCount >= 1)) {
        if (absenceCount >= 2) {
          deductionAmount = 45;
          sanctionType = 'BLAME';
        } else if (absenceCount >= 1) {
          deductionAmount = 20;
          sanctionType = 'RETENUE_SALARIALE_PROPOSEE';
        } else if (lateCount >= 5) {
          deductionAmount = 15;
          sanctionType = 'RETENUE_SALARIALE_PROPOSEE';
        } else if (lateCount >= 3) {
          deductionAmount = 0;
          sanctionType = 'AVERTISSEMENT_VERBAL';
        }
      }

      return {
        matricule: emp.matricule,
        employeeName: `${emp.nom} ${emp.postnom} ${emp.prenom}`,
        department: emp.departement,
        lateCount: existing ? Math.max(existing.lateCount, lateCount) : lateCount,
        totalMinutesLate: existing ? Math.max(existing.totalMinutesLate, totalMinutesLate) : totalMinutesLate,
        absenceCount: existing ? Math.max(existing.absenceCount, absenceCount) : absenceCount,
        proposedSanction: sanctionType,
        deductionAmount,
        currency: existing?.currency || 'USD',
        status: existing?.status || (deductionAmount > 0 ? 'EN_EXAMEN' : 'CONFORME'),
        decisionDate: existing?.decisionDate || null,
        decidedBy: existing?.decidedBy || null,
        decisionMotif: existing?.decisionMotif || (existing?.justificationNotes ?? '')
      };
    }).filter(s => {
      // Must have an actual sanction to serve or deduction to pay!
      const hasRealSanction = s.proposedSanction !== 'AUCUNE' || s.deductionAmount > 0 || s.status === 'APPROUVEE';
      if (!hasRealSanction) return false;

      // Filter by department
      if (selectedDepartment !== 'ALL' && s.department !== selectedDepartment) return false;

      // Filter by employee
      if (selectedEmployeeId !== 'ALL' && s.matricule !== selectedEmployeeId) return false;

      // Filter by encaissement status: already collected vs pending
      if (sanctionFilterMode === 'ENCAISSEE' && (s.status !== 'APPROUVEE' || s.deductionAmount === 0)) return false;
      if (sanctionFilterMode === 'A_PRELEVER' && s.status === 'APPROUVEE') return false;

      return true;
    });
  }, [activeTab, employees, attendanceRecords, sanctionCases, selectedMonth, selectedDepartment, selectedEmployeeId, sanctionFilterMode]);

  // Export to PDF handler (only action button requested)
  const handleExportPdf = () => {
    if (activeTab === 'SANCTIONS') {
      const depInfo = selectedDepartment !== 'ALL' ? ` · Département : ${selectedDepartment}` : ' · Tous départements';
      const encaissementInfo = sanctionFilterMode === 'ENCAISSEE' ? ' · Sanctions déjà encaissées' : sanctionFilterMode === 'A_PRELEVER' ? ' · En cours d\'encaissement' : '';
      
      generateSanctionsPdf(
        dynamicReportTitle,
        monthlySanctionsData,
        companySettings,
        `Période mensuelle : ${selectedMonth}${depInfo}${encaissementInfo} · Siège de Goma, Commune de Karisimbi · Dossiers : ${monthlySanctionsData.length}`
      );
      return;
    }

    if (!isDaily) {
      const depInfo = selectedDepartment !== 'ALL' ? ` · Service : ${selectedDepartment}` : ' · Tous départements';
      const statusInfo = selectedStatus !== 'ALL' ? ` · Filtre statut : ${selectedStatus}` : '';
      generateMonthlyGridPdf(
        selectedMonth,
        monthlySynthesis,
        companySettings,
        `Carnet officiel de synthèse mensuelle (J1 à J${daysInMonth})${depInfo}${statusInfo} · Commune de Karisimbi, Goma`
      );
      return;
    }

    const filterStatusText = selectedStatus !== 'ALL' ? ` · Statut filtré : ${selectedStatus}` : '';
    const filterDepText = selectedDepartment !== 'ALL' ? ` · Service : ${selectedDepartment}` : ' · Tous départements';

    generateAttendancePdf(
      dynamicReportTitle,
      filteredAttendanceData,
      companySettings,
      `Période : ${selectedDate}${filterDepText}${filterStatusText} · Commune de Karisimbi, Goma`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar with ONLY the Download PDF button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink dark:text-white tracking-tight flex items-center gap-2">
            Rapports & Documents Officiels
          </h1>
          <p className="text-xs text-muted dark:text-gray-400 mt-1">
            Génération et exportation au format PDF des relevés de présences et des sanctions disciplinaires mensuelles
          </p>
        </div>

        {/* Action button: ONLY Télécharger PDF */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold shadow-xs transition-colors"
            title="Télécharger le rapport officiel au format PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Télécharger PDF</span>
          </button>
        </div>
      </div>

      {/* DISTINCT TABS: PRÉSENCE VS SANCTIONS DISCIPLINAIRES MENSUELLES */}
      <div className="p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl inline-flex text-xs font-bold shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'ATTENDANCE'
              ? 'bg-white dark:bg-gray-900 text-brand shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
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
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-rose-600'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>Sanctions Disciplinaires Mensuelles</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
            {monthlySanctionsData.length}
          </span>
        </button>
      </div>

      {/* CONFIGURATION & FILTERING PANEL */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        {/* TAB 2: MONTHLY SANCTIONS DISTINCT HEADER BANNER */}
        {activeTab === 'SANCTIONS' && (
          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-rose-900 dark:text-rose-200">
                  Rapport Mensuel des Sanctions Disciplinaires & Retenues Financières
                </p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-400">
                  Période mensuelle : <b className="font-mono">{selectedMonth}</b> · Cumul des manquements non justifiés et retenues soumises à la Direction Générale
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-rose-200 text-rose-700">
              {monthlySanctionsData.length} dossiers pour {selectedMonth}
            </span>
          </div>
        )}

        {/* FILTERS BAR: PERIOD + DEPARTMENT + EMPLOYEE + STATUS (WITHOUT REDUNDANCY) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Period Selector (Day or Month toggle for attendance, Month for sanctions) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-500 font-bold">
                {activeTab === 'SANCTIONS' ? 'Mois sélectionné' : 'Période concernée'}
              </label>
              {activeTab === 'ATTENDANCE' && (
                <div className="flex text-[10px] font-bold bg-gray-200 dark:bg-gray-700 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setPeriodType('JOUR')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      periodType === 'JOUR'
                        ? 'bg-white dark:bg-gray-900 text-brand shadow-2xs font-extrabold'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Jour
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('MOIS')}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      periodType === 'MOIS'
                        ? 'bg-white dark:bg-gray-900 text-brand shadow-2xs font-extrabold'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
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
                className="w-full px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
              />
            ) : (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
              />
            )}
          </div>

          {/* 2. Department Filter */}
          <div>
            <label className="block text-gray-500 font-bold mb-1">Département</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Tous les départements</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Employee Filter */}
          <div>
            <label className="block text-gray-500 font-bold mb-1">Employé spécifique</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-medium text-gray-900 dark:text-white outline-none cursor-pointer truncate"
            >
              <option value="ALL">Tout le personnel</option>
              {employees.map(e => (
                <option key={e.id} value={e.matricule}>{e.matricule} - {e.nom} {e.prenom}</option>
              ))}
            </select>
          </div>

          {/* 4. Filter for Status in Attendance, or Encaissement in Sanctions */}
          {activeTab === 'ATTENDANCE' ? (
            <div>
              <label className="block text-gray-500 font-bold mb-1">
                Filtre par Statut
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="PRESENT">🟢 Présent (P)</option>
                <option value="RETARD">🟠 Retard (R)</option>
                <option value="ABSENT">🔴 Absent (A)</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-gray-500 font-bold mb-1">
                Filtre Sanction / Encaissement
              </label>
              <select
                value={sanctionFilterMode}
                onChange={(e) => setSanctionFilterMode(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="ALL">📋 Toutes les sanctions à écoper</option>
                <option value="ENCAISSEE">🟢 Déjà encaissée / Validée</option>
                <option value="A_PRELEVER">⏳ En cours d'encaissement (À prélever)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT PREVIEW CARD (A4 Print Preview Layout) */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 bg-white dark:bg-gray-900 shadow-md">
        {/* En-tête officiel PREMIDIS SARL */}
        <div className="-mx-2 sm:-mx-4 rounded-xl overflow-hidden bg-white">
          <Letterhead />
        </div>

        {/* Références du document */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-gray-800 text-xs">
          <span className="font-bold uppercase tracking-wider text-brand">
            Document Administratif Officiel
          </span>
          <span className="font-mono text-gray-500">
            Émis le : {new Date().toLocaleDateString('fr-FR')}
          </span>
          <span className="font-bold text-gray-800 dark:text-gray-200">
            Réf : PREMIDIS/RH/ATT/{selectedMonth.replace('-', '')}
          </span>
        </div>

        {/* Document Title Banner */}
        <div className="text-center py-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl space-y-0.5">
          <h2 className="text-base font-black uppercase text-gray-900 dark:text-white tracking-tight">
            {dynamicReportTitle}
          </h2>
          <p className="text-xs text-gray-500">
            Période : {activeTab === 'SANCTIONS' || !isDaily ? selectedMonth : selectedDate} · Service : {selectedDepartment === 'ALL' ? 'Tous départements' : selectedDepartment}
            {activeTab === 'ATTENDANCE' && selectedStatus !== 'ALL' && ` · Statut : ${selectedStatus}`}
            {activeTab === 'SANCTIONS' && sanctionFilterMode !== 'ALL' && ` · Filtre : ${sanctionFilterMode === 'ENCAISSEE' ? 'Déjà encaissées' : 'À prélever'}`}
          </p>
        </div>

        {/* Statistical Summary Bar */}
        {activeTab === 'SANCTIONS' && (
          <div className="flex flex-wrap items-center justify-between text-xs font-bold px-4 py-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
            <span className="text-rose-900 dark:text-rose-200 font-extrabold">
              Dossiers à sanctionner : {monthlySanctionsData.length}
            </span>
            <span className="text-emerald-700 dark:text-emerald-300">
              Déjà encaissées / prélevées : {monthlySanctionsData.filter(s => s.status === 'APPROUVEE').length} ({monthlySanctionsData.filter(s => s.status === 'APPROUVEE').reduce((a, b) => a + b.deductionAmount, 0)} USD)
            </span>
            <span className="text-amber-700 dark:text-amber-300">
              En attente d'encaissement : {monthlySanctionsData.filter(s => s.status === 'EN_EXAMEN').length} ({monthlySanctionsData.filter(s => s.status === 'EN_EXAMEN').reduce((a, b) => a + b.deductionAmount, 0)} USD)
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              Total retenues : {monthlySanctionsData.reduce((a, b) => a + b.deductionAmount, 0)} USD
            </span>
          </div>
        )}
        {activeTab === 'ATTENDANCE' && !isDaily && (
          <div className="flex flex-wrap items-center justify-between text-xs font-bold px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/60">
            <span className="text-gray-700 dark:text-gray-300">Effectif listé : {monthlyStats.totalListed}</span>
            <span className="text-emerald-700 dark:text-emerald-400">Total Présences (P) : {monthlyStats.grandP}</span>
            <span className="text-amber-700 dark:text-amber-400">Total Retards (R) : {monthlyStats.grandR} ({monthlyStats.grandLateMin} min)</span>
            <span className="text-rose-700 dark:text-rose-400">Total Absents (A) : {monthlyStats.grandA}</span>
          </div>
        )}

        {activeTab === 'ATTENDANCE' && isDaily && (
          <div className="flex flex-wrap items-center justify-between text-xs font-bold px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/60">
            <span className="text-gray-700 dark:text-gray-300">Total lignes : {attendanceStats.total}</span>
            <span className="text-emerald-700 dark:text-emerald-400">Présents : {attendanceStats.presents}</span>
            <span className="text-amber-700 dark:text-amber-400">Retards : {attendanceStats.retards} ({attendanceStats.totalLateMin} min)</span>
            <span className="text-rose-700 dark:text-rose-400">Absents : {attendanceStats.absents}</span>
          </div>
        )}

        {/* Live Table Preview */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
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
                  <th className="py-2.5 px-3 text-center">Statut / Encaissement</th>
                  <th className="py-2.5 px-3">Observations / Visa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-medium">
                {monthlySanctionsData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-gray-400">
                      {sanctionFilterMode === 'ENCAISSEE' 
                        ? `Aucune sanction déjà encaissée pour le mois de ${selectedMonth}.`
                        : `Aucun manquement ni dossier disciplinaire pour le mois de ${selectedMonth}.`}
                    </td>
                  </tr>
                ) : (
                  monthlySanctionsData.map((s, idx) => (
                    <tr key={s.matricule} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 px-3 text-gray-400 font-mono text-center">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-brand">{s.matricule}</td>
                      <td className="py-2.5 px-3 font-bold">{s.employeeName}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{s.department}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">
                        {s.lateCount > 0 ? `${s.lateCount} (${s.totalMinutesLate}m)` : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                        {s.absenceCount > 0 ? `${s.absenceCount} j` : '0'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-700 dark:text-gray-300">
                        {s.proposedSanction.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {s.deductionAmount > 0 ? (
                          <span className={`px-2 py-0.5 rounded ${
                            s.status === 'APPROUVEE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 font-black'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200'
                          }`}>
                            -{s.deductionAmount} {s.currency}
                          </span>
                        ) : (
                          <span className="text-gray-400">0 USD</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold ${
                          s.status === 'APPROUVEE' && s.deductionAmount > 0 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-300' 
                            : s.status === 'APPROUVEE' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-200 border border-blue-300' 
                            : s.status === 'REJETEE' 
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300'
                        }`}>
                          {s.status === 'APPROUVEE' && s.deductionAmount > 0 
                            ? '✅ Encaissée sur paie' 
                            : s.status === 'APPROUVEE' 
                            ? '✅ Sanction notifiée' 
                            : s.status === 'REJETEE' 
                            ? '❌ Rejetée' 
                            : '⏳ À prélever (En examen)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-[11px] truncate max-w-[150px]">
                        {s.decisionMotif || (s.decisionDate ? `Visé le ${s.decisionDate}` : 'En attente Direction')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : !isDaily ? (
            /* EXACT MONTHLY SYNTHESIS CARNET J1-J31 GRID REPLICA FROM ATTENDANCE VIEW */
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Carnet Mensuel des Présences (J1 à J{daysInMonth})
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
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
                    <th className="py-2.5 px-2 text-center border-r border-gray-700 w-8">N°</th>
                    <th className="py-2.5 px-3 border-r border-gray-700 min-w-[65px]">Matricule</th>
                    <th className="py-2.5 px-3 border-r border-gray-700 min-w-[150px]">Nom & Postnom</th>
                    <th className="py-2.5 px-3 border-r border-gray-700 min-w-[120px]">Département</th>
                    
                    {/* Days 1 to daysInMonth */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                      <th key={day} className="py-2 px-1 text-center border-r border-gray-700 min-w-[24px]">
                        {day}
                      </th>
                    ))}

                    {/* Monthly Summary Totals */}
                    <th className="py-2.5 px-2 text-center bg-emerald-900/60 border-r border-gray-700 text-emerald-200 min-w-[32px]" title="Total Présents">P</th>
                    <th className="py-2.5 px-2 text-center bg-amber-900/60 border-r border-gray-700 text-amber-200 min-w-[32px]" title="Total Retards">R</th>
                    <th className="py-2.5 px-2 text-center bg-rose-900/60 border-r border-gray-700 text-rose-200 min-w-[32px]" title="Total Absents">A</th>
                    <th className="py-2.5 px-2 text-center bg-gray-800 text-white min-w-[45px]" title="Retard cumulé en minutes">Min.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-medium">
                  {monthlySynthesis.length === 0 ? (
                    <tr>
                      <td colSpan={4 + daysInMonth + 4} className="py-12 text-center text-gray-400">
                        Aucun employé trouvé pour cette sélection.
                      </td>
                    </tr>
                  ) : (
                    monthlySynthesis.map((row) => (
                      <tr key={row.employee.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        <td className="py-2 px-2 text-center font-mono text-gray-400 border-r border-gray-200 dark:border-gray-800">
                          {row.number}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-brand border-r border-gray-200 dark:border-gray-800">
                          {row.employee.matricule}
                        </td>
                        <td className="py-2 px-3 font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-800 truncate max-w-[150px]">
                          {row.employee.nom} {row.employee.postnom} {row.employee.prenom}
                        </td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 truncate max-w-[120px]">
                          {row.employee.departement}
                        </td>

                        {/* Day cells 1 to daysInMonth */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                          const rec = row.days[day];
                          if (!rec) {
                            return (
                              <td key={day} className="py-1 px-1 text-center border-r border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-700">
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
                              className="py-1 px-1 text-center border-r border-gray-200 dark:border-gray-800"
                              title={`J${day} : ${rec.status} (${rec.actualCheckIn || 'Non pointé'})`}
                            >
                              <span className={`inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold ${bg}`}>
                                {char}
                              </span>
                            </td>
                          );
                        })}

                        {/* Totals */}
                        <td className="py-2 px-2 text-center font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-r border-gray-200 dark:border-gray-800">
                          {row.totalP}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-r border-gray-200 dark:border-gray-800">
                          {row.totalR}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-r border-gray-200 dark:border-gray-800">
                          {row.totalA}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/60">
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
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-medium">
                {filteredAttendanceData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-gray-400">
                      Aucune donnée ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filteredAttendanceData.slice(0, 25).map((r, i) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3 text-gray-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-brand">{r.employeeId}</td>
                      <td className="py-2 px-3 font-bold">{r.employeeName}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{r.department}</td>
                      <td className="py-2 px-3 text-center font-mono">{r.date}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{r.actualCheckIn || '–'}</td>
                      <td className="py-2 px-3 text-center font-mono">
                        {r.lateMinutes > 0 ? `+${r.lateMinutes} min` : '0 min'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="py-2 px-3 text-gray-500 truncate max-w-[150px]">
                        {r.notes || (r.isCorrected ? `Ajusté (${r.correctionReason})` : '–')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {activeTab === 'ATTENDANCE' && isDaily && filteredAttendanceData.length > 25 && (
          <p className="text-center text-xs text-gray-400 italic">
            Affichage des 25 premières lignes (le fichier PDF complet contiendra l'intégralité des {filteredAttendanceData.length} lignes).
          </p>
        )}

        {/* Signature & Cachet Blocks */}
        <div className="pt-8 mt-6 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
          <div>
            <p className="font-bold text-gray-800 dark:text-gray-200">Pour le Secrétariat & Contrôle</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Vérification physique des registres</p>
            <div className="h-16 border-b border-dashed border-gray-300 dark:border-gray-700 mt-2 flex items-end justify-center pb-1 text-gray-400 italic text-[10px]">
              Signature de l'opérateur
            </div>
          </div>

          <div>
            <p className="font-bold text-gray-800 dark:text-gray-200">Le Responsable RH</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Examen des justifications & manquements</p>
            <div className="h-16 border-b border-dashed border-gray-300 dark:border-gray-700 mt-2 flex items-end justify-center pb-1 text-gray-400 italic text-[10px]">
              Signature & Cachet RH
            </div>
          </div>

          <div>
            <p className="font-bold text-gray-800 dark:text-gray-200">Pour la Direction Générale</p>
            <p className="text-[11px] text-gray-400 mt-0.5">PREMIDIS SARL – Siège de Goma</p>
            <div className="h-16 border-b border-dashed border-gray-300 dark:border-gray-700 mt-2 flex items-end justify-center pb-1 text-gray-400 italic text-[10px]">
              Signature & Sceau Officiel
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
