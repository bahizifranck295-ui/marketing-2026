import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/Badge';
import { AttendanceRecord } from '../../types';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, XCircle, 
  RefreshCw, Download, ArrowUpRight, ArrowDownRight, 
  Sparkles, Calendar, Filter, ChevronRight, Fingerprint, Eye, Edit3, Search, FileText
} from 'lucide-react';
import { exportToExcel, generateAttendancePdf } from '../../utils/exportUtils';

interface DashboardViewProps {
  onOpenQuickPunch: () => void;
  onOpenCorrectModal: (record: AttendanceRecord) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  onOpenQuickPunch,
  onOpenCorrectModal 
}) => {
  const { 
    attendanceRecords, employees, departments, 
    zktecoConfig, syncZKTecoNow, companySettings, setCurrentView 
  } = useApp();

  const [selectedDate, setSelectedDate] = useState('2026-10-11'); // Default today
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'RETARD' | 'ABSENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Filter records for selected date
  const dayRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Statistics for selected date
  const stats = useMemo(() => {
    const total = dayRecords.length;
    const present = dayRecords.filter(r => r.status === 'PRESENT').length;
    const retard = dayRecords.filter(r => r.status === 'RETARD').length;
    const absent = dayRecords.filter(r => r.status === 'ABSENT').length;
    const totalLateMinutes = dayRecords.reduce((sum, r) => sum + r.lateMinutes, 0);
    const avgLate = retard > 0 ? Math.round(totalLateMinutes / retard) : 0;
    const onTimeRate = total > 0 ? Math.round((present / (present + retard || 1)) * 100) : 100;

    return { total, present, retard, absent, totalLateMinutes, avgLate, onTimeRate };
  }, [dayRecords]);

  // Filtered list for the today table
  const filteredList = useMemo(() => {
    return dayRecords.filter(r => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchDep = selectedDepartment === 'ALL' || r.department === selectedDepartment;
      const matchSearch = searchQuery === '' || 
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchDep && matchSearch;
    });
  }, [dayRecords, statusFilter, selectedDepartment, searchQuery]);

  // Historical trend for 7 days
  const historyTrends = useMemo(() => {
    const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
    return dates.map(d => {
      const recs = attendanceRecords.filter(r => r.date === d);
      const p = recs.filter(r => r.status === 'PRESENT').length;
      const r = recs.filter(r => r.status === 'RETARD').length;
      const a = recs.filter(r => r.status === 'ABSENT').length;
      const total = recs.length || 1;
      return {
        date: d.substring(5), // MM-DD
        present: p,
        retard: r,
        absent: a,
        rate: Math.round((p / total) * 100)
      };
    });
  }, [attendanceRecords]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncZKTecoNow();
      setSyncFeedback(`Synchronisation réussie (${res.punchesImported} pointages)`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback('Erreur de synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickExportExcel = () => {
    const exportData = filteredList.map(r => ({
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
    exportToExcel(exportData, `Presences_PREMIDIS_${selectedDate}`);
  };

  const handleQuickExportPdf = () => {
    const recordsToExport = filteredList.length > 0 ? filteredList : dayRecords;
    const filterInfo = statusFilter !== 'ALL' ? `Statut : ${statusFilter}` : 'Tous les statuts';
    const depInfo = selectedDepartment !== 'ALL' ? `Département : ${selectedDepartment}` : 'Tous départements';

    generateAttendancePdf(
      `Relevé Quotidien des Pointages – ${selectedDate}`,
      recordsToExport,
      companySettings,
      `${filterInfo} · ${depInfo} · Commune de Karisimbi, Goma · Effectif contrôlé : ${recordsToExport.length} agents`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1D2030] dark:text-white tracking-tight flex items-center gap-2">
            Tableau de Bord des Présences
          </h1>
          <p className="text-xs text-[#717787] dark:text-gray-400 mt-1">
            PREMIDIS SARL · Suivi biométrique en temps réel de l'effectif à Goma
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#7C4DFF]" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none text-[#1D2030] dark:text-white cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
            title="Interroger la pointeuse ZKTeco via réseau TCP"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#7C4DFF] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Sync ZKTeco'}</span>
          </button>

          <button
            onClick={onOpenQuickPunch}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7C4DFF] text-white hover:bg-[#6a38f3] text-xs font-semibold shadow-sm transition-all"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Pointer une arrivée</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-xs hover:underline">Fermer</button>
        </div>
      )}

      {/* 3 MANDATORY ATTENDANCE STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. PRÉSENT (GREEN) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'PRESENT' ? 'ALL' : 'PRESENT')}
          className={`cursor-pointer p-5 rounded-2xl glass-card transition-all relative overflow-hidden group ${
            statusFilter === 'PRESENT' ? 'ring-2 ring-emerald-500 shadow-md' : 'hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                PRÉSENTS
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1D2030] dark:text-white tabular-nums tracking-tight">
              {stats.present}
            </span>
            <span className="text-xs text-[#717787] dark:text-gray-400">
              / {stats.total} employés
            </span>
          </div>

          <p className="text-[11px] text-[#717787] dark:text-gray-400 mt-2">
            Arrivés à l'heure conforme à l'horaire et tolérance
          </p>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>Filtrer les présents</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. RETARD (ORANGE / AMBER) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'RETARD' ? 'ALL' : 'RETARD')}
          className={`cursor-pointer p-5 rounded-2xl glass-card transition-all relative overflow-hidden group ${
            statusFilter === 'RETARD' ? 'ring-2 ring-amber-500 shadow-md' : 'hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                RETARDS
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              {stats.totalLateMinutes} min
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {stats.retard}
            </span>
            <span className="text-xs text-[#717787] dark:text-gray-400">
              retardataires aujourd'hui
            </span>
          </div>

          <p className="text-[11px] text-[#717787] dark:text-gray-400 mt-2">
            Arrivée au-delà des 10 min de tolérance configurée
          </p>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            <span>Moyenne: {stats.avgLate} min / retard</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 3. ABSENT (RED / CRIMSON) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'ABSENT' ? 'ALL' : 'ABSENT')}
          className={`cursor-pointer p-5 rounded-2xl glass-card transition-all relative overflow-hidden group ${
            statusFilter === 'ABSENT' ? 'ring-2 ring-rose-500 shadow-md' : 'hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                ABSENTS
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
              {stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
              {stats.absent}
            </span>
            <span className="text-xs text-[#717787] dark:text-gray-400">
              non présent(s)
            </span>
          </div>

          <p className="text-[11px] text-[#717787] dark:text-gray-400 mt-2">
            Aucun pointage détecté sur la journée
          </p>

          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
            <span>Filtrer les absents</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Analytics & Insight Cards (Inspired by the Reference Dashboard Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Average Check-In / On-Time Rate Trend */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#1D2030] dark:text-white">
                Taux de Ponctualité & Évolution Hebdomadaire
              </h3>
              <p className="text-xs text-[#717787] dark:text-gray-400">
                Suivi des arrivées à l'heure vs retards sur les 7 derniers jours
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-[#1D2030] dark:text-white tabular-nums">
                {stats.onTimeRate}%
              </span>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> Ponctualité globale
              </p>
            </div>
          </div>

          {/* SVG Trend Graph */}
          <div className="h-44 w-full pt-4">
            <div className="flex h-32 items-end gap-3 sm:gap-6 justify-between px-2 border-b border-gray-200 dark:border-gray-800">
              {historyTrends.map((t, idx) => {
                const heightPct = Math.max(15, t.rate);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-20">
                      {t.present} Présents · {t.retard} Retards · {t.rate}% à l'heure
                    </div>

                    <div className="w-full max-w-[28px] bg-gray-100 dark:bg-gray-800 rounded-t-lg h-full flex items-end overflow-hidden">
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-[#7C4DFF] to-[#59CBE8] rounded-t-lg transition-all duration-300"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 mt-1">
                      {t.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#7C4DFF]" /> Taux de ponctualité (%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Seuil de tolérance (10m)
              </span>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              Heure de référence : 08h30
            </span>
          </div>
        </div>

        {/* Card 2: Attendance Insight Card (Blue Glass Gradient Card as in Image) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#7C4DFF] to-[#407BFF] text-white flex flex-col justify-between shadow-lg shadow-[#7C4DFF]/15 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
                  Analyse des Risques
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                Rapport RH
              </span>
            </div>

            <div className="mb-4">
              <span className="text-4xl font-black tracking-tight">12%</span>
              <p className="text-xs text-cyan-100 font-medium mt-1">
                Risque de retards cumulés (Prochains 7 jours)
              </p>
            </div>

            <p className="text-xs text-white/85 leading-relaxed">
              Le service Logistique et Usine enregistre la majorité des pointages tardifs les vendredis et lundis matin en raison des embouteillages vers la route de l'Aéroport.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
            <div className="text-[11px] text-cyan-100">
              <span>{employees.length} collaborateurs suivis</span>
            </div>
            <button
              onClick={() => setCurrentView('sanctions')}
              className="px-3 py-1 rounded-lg bg-white text-[#7C4DFF] hover:bg-cyan-50 text-xs font-bold transition-colors shadow-xs"
            >
              Voir les dossiers
            </button>
          </div>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE CHECK-IN/OUT HISTORY TABLE */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1D2030] dark:text-white">
              Historique des Pointages du Jour
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold">
              {filteredList.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Tabs */}
            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xs font-bold' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('PRESENT')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-2xs font-bold' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Présents ({stats.present})
              </button>
              <button
                onClick={() => setStatusFilter('RETARD')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'RETARD' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 shadow-2xs font-bold' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Retards ({stats.retard})
              </button>
              <button
                onClick={() => setStatusFilter('ABSENT')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'ABSENT' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 shadow-2xs font-bold' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Absents ({stats.absent})
              </button>
            </div>

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-none outline-none font-medium cursor-pointer"
            >
              <option value="ALL">Tous départements</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrer employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 sm:w-44 pl-7 pr-3 py-1.5 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#7C4DFF]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2" />
            </div>

            {/* Export buttons */}
            <button
              onClick={handleQuickExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all shadow-2xs"
              title="Exporter un fichier PDF officiel contenant les informations du jour"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Exporter PDF du jour</span>
            </button>
            <button
              onClick={handleQuickExportExcel}
              className="p-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 transition-colors"
              title="Exporter cette liste en Excel"
            >
              <Download className="w-4 h-4 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-[#717787] dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="py-3 px-3.5">Matricule</th>
                <th className="py-3 px-3.5">Employé</th>
                <th className="py-3 px-3.5">Département</th>
                <th className="py-3 px-3.5 text-center">Entrée Prévue</th>
                <th className="py-3 px-3.5 text-center">Pointage Entrée</th>
                <th className="py-3 px-3.5 text-center">Retard</th>
                <th className="py-3 px-3.5 text-center">Pointage Sortie</th>
                <th className="py-3 px-3.5 text-center">Statut</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Aucun pointage trouvé pour ces critères de filtre.
                  </td>
                </tr>
              ) : (
                filteredList.map((record) => {
                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-[#7C4DFF]">
                        {record.employeeId}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                            {record.employeeName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-[#1D2030] dark:text-white block">
                              {record.employeeName}
                            </span>
                            {record.isCorrected && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                Corrigé ({record.correctionReason || 'vérifié'})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-gray-600 dark:text-gray-400">
                        {record.department}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono text-gray-500">
                        {record.expectedCheckIn}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold">
                        {record.actualCheckIn ? (
                          <span className={record.status === 'RETARD' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}>
                            {record.actualCheckIn}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">–</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono">
                        {record.lateMinutes > 0 ? (
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            +{record.lateMinutes} min
                          </span>
                        ) : (
                          <span className="text-gray-400">0 min</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono text-gray-700 dark:text-gray-300">
                        {record.actualCheckOut || <span className="text-gray-300 dark:text-gray-600">–</span>}
                      </td>

                      {/* STRICT 3-STATUS BADGE */}
                      <td className="py-3 px-3.5 text-center">
                        <StatusBadge status={record.status} size="sm" />
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => onOpenCorrectModal(record)}
                          className="p-1 rounded-lg text-gray-500 hover:text-[#7C4DFF] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Corriger ou documenter ce pointage"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & view all link */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>
            Affichage de {filteredList.length} sur {dayRecords.length} pointages enregistrés
          </span>
          <button
            onClick={() => setCurrentView('attendance')}
            className="text-xs font-bold text-[#7C4DFF] hover:underline flex items-center gap-1"
          >
            Consulter le registre complet des présences →
          </button>
        </div>
      </div>
    </div>
  );
};
