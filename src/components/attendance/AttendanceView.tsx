import React, { useState, useMemo, useCallback } from 'react';
import { ReportsView } from '../reports/ReportsView';
import { exportPreviewToPdf } from '../../utils/previewPdf';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import { EmployeeCarnet } from './EmployeeCarnet';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { StatusBadge, CodeBadge } from '../common/Badge';
import { Calendar, Search, FileText } from 'lucide-react';
import { generateAttendancePdf } from '../../utils/exportUtils';

interface AttendanceViewProps {
  onOpenCorrectModal: (record: AttendanceRecord) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  onOpenCorrectModal
}) => {
  const { attendanceRecords, employees, departments, workingDate, carnetEmployee, openEmployeeCarnet, can } = useApp();
  const canEdit = can('attendance', 'edit');
  const canExport = can('attendance', 'export');

  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY_GRID'>('DAILY');
  const [selectedDate, setSelectedDate] = useState(workingDate);
  const [selectedMonth, setSelectedMonth] = useState(workingDate.slice(0, 7)); // AAAA-MM, mois de la date de travail
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | AttendanceStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Daily records
  const dailyRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Filtered daily list
  const filteredDailyList = useMemo(() => {
    return dailyRecords.filter(r => {
      const matchStatus = selectedStatus === 'ALL' || r.status === selectedStatus;
      const matchDep = selectedDepartment === 'ALL' || r.department === selectedDepartment;
      const matchSearch = searchQuery === '' ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchDep && matchSearch;
    });
  }, [dailyRecords, selectedStatus, selectedDepartment, searchQuery]);

  // Nombre réel de jours du mois choisi (28 à 31)
  const monthDays = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => i + 1);
  }, [selectedMonth]);

  // Grille mensuelle J1 à la fin du mois
  const monthlySynthesis = useMemo(() => {
    const daysInMonth = monthDays.length;
    const monthPrefix = selectedMonth; // ex. "2026-10"

    // Group records by employee
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
      const matchSearch = searchQuery === '' || 
        `${row.employee.nom} ${row.employee.postnom} ${row.employee.prenom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.employee.matricule.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDep && matchSearch;
    });
  }, [employees, attendanceRecords, selectedMonth, monthDays, selectedDepartment, searchQuery]);

  // Export handlers
  const handleExportDailyPdf = () => {
    generateAttendancePdf(
      `Carnet de Présence – ${selectedDate}`,
      filteredDailyList,
      `Service : ${selectedDepartment === 'ALL' ? 'Tous départements' : selectedDepartment} · Commune de Karisimbi`
    );
  };

  // Même document que Rapports › Mois (en-tête officiel, bilan, grille J1-J31), préparé hors écran puis exporté
  const [exportingMonthly, setExportingMonthly] = useState(false);
  const handleMonthlyDocumentReady = useCallback(async (el: HTMLDivElement, title: string) => {
    try {
      await exportPreviewToPdf(el, title);
    } finally {
      setExportingMonthly(false);
    }
  }, []);

  if (carnetEmployee) {
    return <EmployeeCarnet matricule={carnetEmployee} onClose={() => openEmployeeCarnet(null)} onOpenCorrectModal={onOpenCorrectModal} />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Carnet de Présence du Personnel
          </h1>
          <p className="text-xs text-muted mt-1">
            Relevé officiel des pointages journaliers et carnet de synthèse mensuelle (J1 - J31)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Switcher: Daily vs Monthly */}
          <div className="p-1 bg-slate-200/80 rounded-xl flex items-center text-xs font-bold shadow-2xs">
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'DAILY'
                  ? 'bg-white text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Registre Journalier
            </button>
            <button
              onClick={() => setActiveTab('MONTHLY_GRID')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'MONTHLY_GRID'
                  ? 'bg-white text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Synthèse Mensuelle (J1 - J{monthDays.length})
            </button>
          </div>

        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="p-4 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'DAILY' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-brand" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none font-mono cursor-pointer text-slate-900 font-semibold"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-brand" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent outline-none font-mono cursor-pointer text-slate-900 font-semibold"
              />
            </div>
          )}

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-medium outline-none cursor-pointer border border-slate-200"
          >
            <option value="ALL">Tous les départements</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter (Only on Daily) */}
          {activeTab === 'DAILY' && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-medium outline-none cursor-pointer border border-slate-200"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PRESENT">Présent (P)</option>
              <option value="RETARD">Retard (R)</option>
              <option value="ABSENT">Absent (A)</option>
            </select>
          )}

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher nom, matricule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-60 pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 text-slate-900 placeholder-slate-400 outline-none border border-slate-200 focus:ring-1 focus:ring-brand"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {!canExport ? null : activeTab === 'DAILY' ? (
            <>
              <button
                onClick={handleExportDailyPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                title="Télécharger le carnet de présence du jour en PDF officiel"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>

            </>
          ) : (
            <button
              onClick={() => setExportingMonthly(true)}
              disabled={exportingMonthly}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-semibold shadow-xs transition-colors disabled:opacity-60"
              title="Exporter la feuille de synthèse mensuelle J1-J31 en PDF, avec l'en-tête officiel PREMIDIS SARL"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{exportingMonthly ? 'Préparation du PDF…' : 'Exporter Grille Mensuelle PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: DAILY REGISTRY TABLE */}
      {activeTab === 'DAILY' && (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-ink">
                Pointages constatés le {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                {filteredDailyList.length} entrées
              </span>
            </div>

            {/* Legend for the 3 strict statuses */}
            <div className="hidden md:flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Présent (P)
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Retard (R)
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absent (A)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-muted font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3">Matricule</th>
                  <th className="py-3 px-3">Nom & Postnom</th>
                  <th className="py-3 px-3">Département</th>
                  <th className="py-3 px-3 text-center">Entrée Prévue</th>
                  <th className="py-3 px-3 text-center">Entrée Constatée</th>
                  <th className="py-3 px-3 text-center">Retard (min)</th>
                  <th className="py-3 px-3 text-center">Sortie Prévue</th>
                  <th className="py-3 px-3 text-center">Sortie Constatée</th>
                  <th className="py-3 px-3 text-center">Statut (P / R / A)</th>
                  <th className="py-3 px-3">Source & Notes</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDailyList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Aucun pointage trouvé pour cette date.
                    </td>
                  </tr>
                ) : (
                  filteredDailyList.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand">
                        {record.employeeId}
                      </td>

                      <td className="py-3 px-3 font-bold text-ink">
                        <span className="flex items-center gap-2"><EmployeeAvatar matricule={record.employeeId} name={record.employeeName} size={32} />{record.employeeName}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {record.department}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {record.expectedCheckIn}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {record.actualCheckIn ? (
                          <span className={record.status === 'RETARD' ? 'text-amber-600' : 'text-slate-900'}>
                            {record.actualCheckIn}
                          </span>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        {record.lateMinutes > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            +{record.lateMinutes} min
                          </span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {record.expectedCheckOut}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        {record.actualCheckOut || <span className="text-slate-300">–</span>}
                      </td>

                      {/* STRICT 3-STATUS BADGE */}
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={record.status} size="sm" />
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        <div>
                          <span className="font-semibold text-slate-700">
                            {record.source === 'ZKTECO_BIOMETRIC' ? 'Biométrie' : record.source === 'FILE_IMPORT' ? 'Clé USB' : 'Manuel'}
                          </span>
                          {record.isCorrected && (
                            <span className="block text-amber-600 font-medium">
                              Corrigé : {record.correctionReason}
                            </span>
                          )}
                          {record.notes && !record.isCorrected && (
                            <span className="block text-slate-400 truncate max-w-[120px]">
                              {record.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {canEdit && <button
                          onClick={() => onOpenCorrectModal(record)}
                          className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-600 font-semibold transition-colors text-[11px]"
                        >
                          Modifier
                        </button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: SYNTHÈSE MENSUELLE CARNET J1-J31 (EXACT REPLICA OF PREMIDIS EXCEL LOGBOOK) */}
      {activeTab === 'MONTHLY_GRID' && (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-ink">
                Carnet de Synthèse Mensuelle des Présences (J1 à J{monthDays.length})
              </h3>
              <p className="text-xs text-slate-500">
                Mois sélectionné : {selectedMonth} · Codes réglementaires : P = Présent (vert), R = Retard (orange), A = Absent (rouge)
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5"><CodeBadge status="PRESENT" /> = Présent</span>
              <span className="flex items-center gap-1.5"><CodeBadge status="RETARD" /> = Retard</span>
              <span className="flex items-center gap-1.5"><CodeBadge status="ABSENT" /> = Absent</span>
            </div>
          </div>

          {/* Grid table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#14233B] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-2 text-center border-r border-slate-700 w-8">N°</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 min-w-[65px]">Matricule</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 min-w-[150px]">Nom & Postnom</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 min-w-[120px]">Département</th>
                  
                  {/* Jours du mois */}
                  {monthDays.map(day => (
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
                    <td colSpan={monthDays.length + 8} className="py-12 text-center text-slate-400">
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

                      {/* Une cellule par jour du mois */}
                      {monthDays.map(day => {
                        const rec = row.days[day];
                        if (!rec) {
                          return (
                            <td key={day} className="py-1 px-1 text-center border-r border-slate-200 text-slate-300">
                              ·
                            </td>
                          );
                        }

                        // Colors: P=Green, R=Orange, A=Red
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
        </div>
      )}
      {exportingMonthly && (
        <div aria-hidden style={{ position: 'fixed', left: -20000, top: 0, width: 1280, pointerEvents: 'none' }}>
          <ReportsView
            preset={{ period: 'MOIS', month: selectedMonth, department: selectedDepartment, status: selectedStatus }}
            onDocumentReady={handleMonthlyDocumentReady}
          />
        </div>
      )}
    </div>
  );
};
