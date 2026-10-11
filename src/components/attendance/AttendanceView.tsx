import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { StatusBadge, CodeBadge } from '../common/Badge';
import { 
  Calendar, Search, Filter, Download, Printer, 
  Edit3, Plus, CheckCircle2, AlertTriangle, Clock, RefreshCw, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { exportToExcel, generateAttendancePdf } from '../../utils/exportUtils';

interface AttendanceViewProps {
  onOpenQuickPunch: () => void;
  onOpenCorrectModal: (record: AttendanceRecord) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  onOpenQuickPunch,
  onOpenCorrectModal
}) => {
  const { attendanceRecords, employees, departments, companySettings } = useApp();

  const [activeTab, setActiveTab] = useState<'DAILY' | 'MONTHLY_GRID'>('DAILY');
  const [selectedDate, setSelectedDate] = useState('2026-10-11');
  const [selectedMonth, setSelectedMonth] = useState('2026-10'); // YYYY-MM
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

  // Monthly Grid Data (J1 to J31)
  const monthlySynthesis = useMemo(() => {
    const daysInMonth = 31; // October has 31 days
    const monthPrefix = selectedMonth; // e.g. "2026-10"

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
  }, [employees, attendanceRecords, selectedMonth, selectedDepartment, searchQuery]);

  // Export handlers
  const handleExportDailyExcel = () => {
    const data = filteredDailyList.map(r => ({
      Matricule: r.employeeId,
      'Nom Complet': r.employeeName,
      Département: r.department,
      Date: r.date,
      'Entrée Prévue': r.expectedCheckIn,
      'Entrée Constatée': r.actualCheckIn || '–',
      'Retard (min)': r.lateMinutes,
      'Sortie Prévue': r.expectedCheckOut,
      'Sortie Constatée': r.actualCheckOut || '–',
      Statut: r.status,
      Source: r.source,
      Observations: r.notes || (r.isCorrected ? 'Corrigé manuellement' : '')
    }));
    exportToExcel(data, `Carnet_Presence_Journalier_${selectedDate}`);
  };

  const handleExportDailyPdf = () => {
    generateAttendancePdf(
      `Carnet de Présence – ${selectedDate}`,
      filteredDailyList,
      companySettings,
      `Service : ${selectedDepartment === 'ALL' ? 'Tous départements' : selectedDepartment} · Commune de Karisimbi`
    );
  };

  const handleExportMonthlyExcel = () => {
    const data = monthlySynthesis.map(row => {
      const rowObj: any = {
        'N°': row.number,
        Matricule: row.employee.matricule,
        'Nom & Postnom': `${row.employee.nom} ${row.employee.postnom} ${row.employee.prenom}`,
        Département: row.employee.departement
      };
      for (let day = 1; day <= 31; day++) {
        const rec = row.days[day];
        rowObj[`J${day}`] = rec ? rec.status.charAt(0) : '–';
      }
      rowObj['Total Présents (P)'] = row.totalP;
      rowObj['Total Retards (R)'] = row.totalR;
      rowObj['Total Absents (A)'] = row.totalA;
      rowObj['Total Retard (min)'] = row.totalLateMin;
      return rowObj;
    });
    exportToExcel(data, `Synthese_Mensuelle_${selectedMonth}`, 'Synthese_Mensuelle');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1D2030] dark:text-white tracking-tight">
            Carnet de Présence du Personnel
          </h1>
          <p className="text-xs text-[#717787] dark:text-gray-400 mt-1">
            Relevé officiel des pointages journaliers et carnet de synthèse mensuelle (J1 - J31)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tab Switcher: Daily vs Monthly */}
          <div className="p-1 bg-gray-200/80 dark:bg-gray-800 rounded-xl flex items-center text-xs font-bold shadow-2xs">
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'DAILY'
                  ? 'bg-white dark:bg-gray-900 text-[#7C4DFF] shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Registre Journalier
            </button>
            <button
              onClick={() => setActiveTab('MONTHLY_GRID')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'MONTHLY_GRID'
                  ? 'bg-white dark:bg-gray-900 text-[#7C4DFF] shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Synthèse Mensuelle (J1 - J31)
            </button>
          </div>

          <button
            onClick={onOpenQuickPunch}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7C4DFF] text-white hover:bg-[#6a38f3] text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pointer une présence</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="p-4 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'DAILY' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Calendar className="w-3.5 h-3.5 text-[#7C4DFF]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent outline-none font-mono cursor-pointer text-gray-900 dark:text-white font-semibold"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <Calendar className="w-3.5 h-3.5 text-[#7C4DFF]" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent outline-none font-mono cursor-pointer text-gray-900 dark:text-white font-semibold"
              />
            </div>
          )}

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium outline-none cursor-pointer border border-gray-200 dark:border-gray-700"
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
              className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium outline-none cursor-pointer border border-gray-200 dark:border-gray-700"
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
              className="w-48 sm:w-60 pl-8 pr-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-[#7C4DFF]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'DAILY' ? (
            <>
              <button
                onClick={handleExportDailyPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold transition-colors"
                title="Télécharger le carnet de présence du jour en PDF officiel"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>

              <button
                onClick={handleExportDailyExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold transition-colors"
                title="Exporter les pointages du jour en Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleExportMonthlyExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-xs transition-colors"
              title="Exporter la feuille de synthèse mensuelle J1-J31 en Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Grille Mensuelle Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: DAILY REGISTRY TABLE */}
      {activeTab === 'DAILY' && (
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#1D2030] dark:text-white">
                Pointages constatés le {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 font-bold text-gray-600 dark:text-gray-400">
                {filteredDailyList.length} entrées
              </span>
            </div>

            {/* Legend for the 3 strict statuses */}
            <div className="hidden md:flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Présent (P)
              </span>
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Retard (R)
              </span>
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absent (A)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-[#717787] dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
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
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {filteredDailyList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400">
                      Aucun pointage trouvé pour cette date.
                    </td>
                  </tr>
                ) : (
                  filteredDailyList.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#7C4DFF]">
                        {record.employeeId}
                      </td>

                      <td className="py-3 px-3 font-bold text-[#1D2030] dark:text-white">
                        {record.employeeName}
                      </td>

                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                        {record.department}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-gray-500">
                        {record.expectedCheckIn}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {record.actualCheckIn ? (
                          <span className={record.status === 'RETARD' ? 'text-amber-600' : 'text-gray-900 dark:text-white'}>
                            {record.actualCheckIn}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">–</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        {record.lateMinutes > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            +{record.lateMinutes} min
                          </span>
                        ) : (
                          <span className="text-gray-400">0 min</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-gray-500">
                        {record.expectedCheckOut}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        {record.actualCheckOut || <span className="text-gray-300 dark:text-gray-600">–</span>}
                      </td>

                      {/* STRICT 3-STATUS BADGE */}
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={record.status} size="sm" />
                      </td>

                      <td className="py-3 px-3 text-gray-500 text-[11px]">
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {record.source === 'ZKTECO_BIOMETRIC' ? 'Biométrie' : 'Manuel'}
                          </span>
                          {record.isCorrected && (
                            <span className="block text-amber-600 dark:text-amber-400 font-medium">
                              Corrigé : {record.correctionReason}
                            </span>
                          )}
                          {record.notes && !record.isCorrected && (
                            <span className="block text-gray-400 truncate max-w-[120px]">
                              {record.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onOpenCorrectModal(record)}
                          className="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold transition-colors text-[11px]"
                        >
                          Modifier
                        </button>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h3 className="text-base font-bold text-[#1D2030] dark:text-white">
                Carnet de Synthèse Mensuelle des Présences (J1 à J31)
              </h3>
              <p className="text-xs text-gray-500">
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
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-[#14233B] text-white font-bold">
                <tr>
                  <th className="py-2.5 px-2 text-center border-r border-gray-700 w-8">N°</th>
                  <th className="py-2.5 px-3 border-r border-gray-700 min-w-[65px]">Matricule</th>
                  <th className="py-2.5 px-3 border-r border-gray-700 min-w-[150px]">Nom & Postnom</th>
                  <th className="py-2.5 px-3 border-r border-gray-700 min-w-[120px]">Département</th>
                  
                  {/* Days 1 to 31 */}
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
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
                    <td colSpan={39} className="py-12 text-center text-gray-400">
                      Aucun employé trouvé pour cette sélection.
                    </td>
                  </tr>
                ) : (
                  monthlySynthesis.map((row) => (
                    <tr key={row.employee.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="py-2 px-2 text-center font-mono text-gray-400 border-r border-gray-200 dark:border-gray-800">
                        {row.number}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-[#7C4DFF] border-r border-gray-200 dark:border-gray-800">
                        {row.employee.matricule}
                      </td>
                      <td className="py-2 px-3 font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-800 truncate max-w-[150px]">
                        {row.employee.nom} {row.employee.postnom} {row.employee.prenom}
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 truncate max-w-[120px]">
                        {row.employee.departement}
                      </td>

                      {/* Day cells 1 to 31 */}
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                        const rec = row.days[day];
                        if (!rec) {
                          return (
                            <td key={day} className="py-1 px-1 text-center border-r border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-700">
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
        </div>
      )}
    </div>
  );
};
