import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import { StatusBadge } from '../common/Badge';
import { AttendanceRecord } from '../../types';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, XCircle, 
  RefreshCw, Download, ArrowUpRight, ArrowDownRight, 
  Sparkles, Calendar, Filter, ChevronRight, Fingerprint, Eye, Edit3, Search, FileText
} from 'lucide-react';
import { exportToExcel, generateAttendancePdf } from '../../utils/exportUtils';

const SANCTION_LABEL: Record<string, string> = {
  AVERTISSEMENT_VERBAL: 'Avertissement verbal',
  AVERTISSEMENT_ECRIT: 'Avertissement écrit',
  BLAME: 'Blâme',
  MISE_A_PIED_PROPOSEE: 'Mise à pied proposée',
  RETENUE_SALARIALE_PROPOSEE: 'Retenue salariale proposée',
  EXCLUSION_TEMPORAIRE: 'Exclusion temporaire',
};
/** Poids d'une règle : l'exclusion temporaire d'abord (et sa durée), puis la retenue, puis le niveau */
const weight = (r: { sanctionType: string; deductionAmount: number; exclusionDays?: number }) =>
  (r.sanctionType === 'EXCLUSION_TEMPORAIRE' ? 100000 + (r.exclusionDays || 1) * 1000 : 0) + r.deductionAmount * 10 + SANCTION_ORDER.indexOf(r.sanctionType);
/** Du moins lourd au plus lourd */
const SANCTION_ORDER = ['AVERTISSEMENT_VERBAL', 'AVERTISSEMENT_ECRIT', 'BLAME', 'RETENUE_SALARIALE_PROPOSEE', 'MISE_A_PIED_PROPOSEE', 'EXCLUSION_TEMPORAIRE'];

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
    zktecoConfig, syncZKTecoNow, companySettings, setCurrentView, workingDate, openEmployeeCarnet, sanctionRules, openReport 
  } = useApp();

  const [selectedDate, setSelectedDate] = useState(workingDate);
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

  // Top 5 des retardataires : du 1er du mois au jour affiché, classés par minutes de retard cumulées
  const topLate = useMemo(() => {
    const monthStart = `${selectedDate.slice(0, 7)}-01`;
    const recs = attendanceRecords.filter(r => r.date >= monthStart && r.date <= selectedDate);
    return employees
      .map(emp => {
        const mine = recs.filter(r => r.employeeId === emp.matricule);
        const late = mine.filter(r => r.status === 'RETARD');
        return {
          emp,
          lateCount: late.length,
          lateMinutes: late.reduce((n, r) => n + r.lateMinutes, 0),
          absences: mine.filter(r => r.status === 'ABSENT').length,
        };
      })
      .filter(t => t.lateCount > 0)
      .sort((a, b) => b.lateMinutes - a.lateMinutes || b.lateCount - a.lateCount || b.absences - a.absences)
      .slice(0, 5);
  }, [attendanceRecords, employees, selectedDate]);
  const topLateLabel = useMemo(() => {
    const label = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [selectedDate]);

  // Employés ayant atteint un seuil de sanction : règles actives appliquées du 1er du mois au jour affiché.
  // Pour chacun, la règle la plus lourde atteinte (retenue la plus forte, puis niveau de sanction).
  const sanctionReached = useMemo(() => {
    const monthStart = `${selectedDate.slice(0, 7)}-01`;
    const recs = attendanceRecords.filter(r => r.date >= monthStart && r.date <= selectedDate);
    const rules = sanctionRules.filter(r => r.isActive && r.period === 'MONTH');
    const reached = employees.flatMap(emp => {
      const mine = recs.filter(r => r.employeeId === emp.matricule);
      const late = mine.filter(r => r.status === 'RETARD');
      const lateCount = late.length;
      const lateMinutes = late.reduce((n, r) => n + r.lateMinutes, 0);
      const absences = mine.filter(r => r.status === 'ABSENT').length;
      const hits = rules.filter(rule => {
        const lateOk = lateCount >= Math.max(1, rule.thresholdLateCount) && lateMinutes >= rule.thresholdLateMinutes;
        const absOk = absences >= Math.max(1, rule.thresholdAbsenceCount);
        return rule.targetType === 'RETARD' ? lateOk : rule.targetType === 'ABSENCE' ? absOk : lateOk && absOk;
      });
      if (!hits.length) return [];
      const rule = hits.sort((a, b) => weight(b) - weight(a))[0];
      return [{ emp, lateCount, lateMinutes, absences, rule }];
    });
    reached.sort((a, b) => weight(b.rule) - weight(a.rule) || b.lateMinutes - a.lateMinutes);
    return { total: reached.length, rows: reached.slice(0, 5) };
  }, [attendanceRecords, employees, sanctionRules, selectedDate]);

  // Les 7 jours qui se terminent au jour affiché (le dernier jour importé depuis la pointeuse)
  const historyTrends = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${selectedDate}T12:00:00`);
      d.setDate(d.getDate() - 6 + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
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
        rate: Math.round((p / total) * 100),
        empty: recs.length === 0
      };
    });
  }, [attendanceRecords, selectedDate]);

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Tableau de Bord des Présences
          </h1>
          <p className="text-xs text-muted mt-1">
            PREMIDIS SARL · Suivi biométrique en temps réel de l'effectif à Goma
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none text-ink cursor-pointer font-mono"
            />
          </div>


        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-xs hover:underline">Fermer</button>
        </div>
      )}

      {/* Indicateurs du jour : tuiles en dégradé (même langage que PREMIDIS ERP), cliquables pour filtrer */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {([
          { key: 'PRESENT', label: 'Présents', value: stats.present, sub: `/ ${stats.total} employés · arrivés à l'heure`, chip: `${stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0} %`, icon: CheckCircle2, bg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', action: 'Filtrer les présents' },
          { key: 'RETARD', label: 'Retards', value: stats.retard, sub: `${stats.totalLateMinutes} min cumulées · au-delà de la tolérance`, chip: `${stats.totalLateMinutes} min`, icon: Clock, bg: 'linear-gradient(135deg, #f59e0b 0%, #ea7a0c 100%)', action: 'Filtrer les retards' },
          { key: 'ABSENT', label: 'Absents', value: stats.absent, sub: 'Aucun pointage détecté sur la journée', chip: `${stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0} %`, icon: XCircle, bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', action: 'Filtrer les absents' },
        ] as const).map(c => {
          const Icon = c.icon;
          const active = statusFilter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setStatusFilter(active ? 'ALL' : c.key)}
              aria-pressed={active}
              style={{ backgroundImage: c.bg }}
              className={`group relative block overflow-hidden rounded-2xl p-4 text-left text-white shadow-md transition-all active:scale-[0.98] ${active ? 'ring-4 ring-white/60 ring-offset-2 ring-offset-[var(--bg-primary)]' : 'hover:brightness-105'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pt-0.5 text-[12px] font-medium leading-tight text-white/85">{c.label} du jour</div>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[clamp(22px,2vw,28px)] font-bold leading-tight tracking-tight tabular-nums">{c.value}</span>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">{c.chip}</span>
              </div>
              <div className="mt-2 text-[11px] font-medium text-white/85">{c.sub}</div>
              <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-2 text-[11px] font-semibold">
                <span>{active ? 'Filtre actif · cliquer pour tout afficher' : c.action}</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Analytics & Insight Cards (Inspired by the Reference Dashboard Image) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Average Check-In / On-Time Rate Trend */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-ink">
                Taux de Ponctualité & Évolution Hebdomadaire
              </h3>
              <p className="text-xs text-muted">
                Suivi des arrivées à l'heure vs retards sur les 7 derniers jours
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-ink tabular-nums">
                {stats.onTimeRate}%
              </span>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> Ponctualité globale
              </p>
            </div>
          </div>

          {/* SVG Trend Graph */}
          <div className="h-44 w-full pt-4">
            <div className="flex h-32 items-end gap-3 sm:gap-6 justify-between px-2 border-b border-slate-200">
              {historyTrends.map((t, idx) => {
                const heightPct = t.empty ? 0 : Math.max(15, t.rate);
                return (
                  <div key={idx} className="flex-1 h-full flex flex-col items-center gap-1 group relative">
                    {/* Hover tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-20">
                      {t.empty ? 'Aucune donnée importée' : `${t.present} Présents · ${t.retard} Retards · ${t.rate}% à l'heure`}
                    </div>

                    <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg flex-1 flex items-end overflow-hidden">
                      <div 
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-brand to-neon rounded-t-lg transition-all duration-300"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 mt-1">
                      {t.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-brand" /> Taux de ponctualité (%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Seuil de tolérance (10m)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Heure de référence : 08h30
            </span>
          </div>

          {/* Employés ayant atteint un seuil de sanction (règles actives du module Sanctions) */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Seuil de sanction atteint
                </h3>
                <p className="text-[11px] text-slate-500">
                  {topLateLabel} jusqu'au {selectedDate.split('-').reverse().join('/')} · {sanctionReached.total} employé{sanctionReached.total > 1 ? 's' : ''} concerné{sanctionReached.total > 1 ? 's' : ''}
                  {sanctionReached.total > 5 ? ' · les 5 cas les plus lourds' : ''}
                </p>
              </div>
              <button onClick={() => openReport('SANCTIONS', selectedDate.slice(0, 7))} className="text-xs font-bold text-brand hover:underline">
                Voir le rapport des sanctions →
              </button>
            </div>

            {sanctionReached.rows.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Aucun employé n'a atteint un seuil de sanction ce mois-ci.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-3">Employé</th>
                      <th className="py-2 px-3 text-center">Retards</th>
                      <th className="py-2 px-3 text-center">Absences</th>
                      <th className="py-2 px-3">Seuil atteint</th>
                      <th className="py-2 px-3">Sanction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sanctionReached.rows.map(({ emp, lateCount, lateMinutes, absences, rule }) => (
                      <tr key={emp.matricule} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 min-w-[270px]">
                          <div className="flex items-center gap-2">
                            <EmployeeAvatar matricule={emp.matricule} size={36} />
                            <div className="min-w-0">
                              <button
                                onClick={() => openEmployeeCarnet(emp.matricule)}
                                className="block text-left font-bold text-slate-900 hover:text-brand hover:underline underline-offset-2"
                                title={`Ouvrir le carnet de présence de ${emp.nom} ${emp.postnom} ${emp.prenom}`}
                              >
                                {emp.nom} {emp.postnom} {emp.prenom}
                              </button>
                              <p className="text-[10px] text-slate-500">{emp.departement} · {emp.poste}</p>
                              <p className="font-mono text-[10px] text-slate-400 whitespace-nowrap">{emp.matricule} · {emp.telephone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-amber-600 whitespace-nowrap">{lateCount ? `${lateCount} · ${lateMinutes} min` : '—'}</td>
                        <td className="py-2 px-3 text-center font-bold text-rose-600">{absences || '—'}</td>
                        <td className="py-2 px-3 text-[11px] leading-snug text-slate-600 min-w-[140px]">{rule.name}</td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] leading-snug">
                            {SANCTION_LABEL[rule.sanctionType] ?? rule.sanctionType}
                            {rule.sanctionType === 'EXCLUSION_TEMPORAIRE' && ` · ${rule.exclusionDays || 1} j`}
                          </span>
                          {rule.deductionAmount > 0 && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Retenue {rule.deductionAmount} {rule.currency}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Top 5 des retardataires du mois (jusqu'au jour affiché) */}
        <div className="hero-surface p-5 rounded-2xl text-white flex flex-col self-start shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-1 relative">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Top 5 des retardataires
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
              {topLateLabel}
            </span>
          </div>
          <p className="text-[11px] text-white/75 mb-3 relative">
            Classés par minutes de retard cumulées · absences du mois · cliquez sur un nom pour ouvrir son carnet
          </p>

          {topLate.length === 0 ? (
            <p className="flex-1 flex items-center justify-center text-xs text-white/80 text-center py-6 relative">
              Aucun retard enregistré ce mois-ci.
            </p>
          ) : (
            <ol className="space-y-1.5 relative">
              {topLate.map((t, i) => (
                <li key={t.emp.matricule} className="flex items-center gap-2.5 rounded-xl bg-white/10 ring-1 ring-white/15 px-2.5 py-1.5">
                  <span className="w-4 text-center text-xs font-black text-white/70">{i + 1}</span>
                  <span className="shrink-0 rounded-full bg-white ring-2 ring-white/40">
                    <EmployeeAvatar matricule={t.emp.matricule} size={32} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => openEmployeeCarnet(t.emp.matricule)}
                      className="block max-w-full text-left text-xs font-bold leading-snug text-white hover:underline underline-offset-2"
                      title={`Ouvrir le carnet de présence de ${t.emp.nom} ${t.emp.postnom} ${t.emp.prenom}`}
                    >
                      {t.emp.nom} {t.emp.postnom} {t.emp.prenom}
                    </button>
                    <p className="truncate text-[10px] text-white/75">{t.emp.departement} · {t.emp.poste}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-white">{t.lateMinutes} min</p>
                    <p className="text-[10px] text-white/80">
                      {t.lateCount} retard{t.lateCount > 1 ? 's' : ''} · {t.absences} abs.
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between relative">
            <span className="text-[11px] text-white/80">{employees.length} collaborateurs suivis</span>
            <button
              onClick={() => setCurrentView('employees')}
              className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 ring-1 ring-white/25 text-white text-xs font-bold transition-colors"
            >
              Voir les employés
            </button>
          </div>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE CHECK-IN/OUT HISTORY TABLE */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-ink">
              Historique des Pointages du Jour
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {filteredList.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'}`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('PRESENT')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-bold' : 'text-slate-600'}`}
              >
                Présents ({stats.present})
              </button>
              <button
                onClick={() => setStatusFilter('RETARD')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'RETARD' ? 'bg-amber-50 text-amber-700 shadow-2xs font-bold' : 'text-slate-600'}`}
              >
                Retards ({stats.retard})
              </button>
              <button
                onClick={() => setStatusFilter('ABSENT')}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'ABSENT' ? 'bg-rose-50 text-rose-700 shadow-2xs font-bold' : 'text-slate-600'}`}
              >
                Absents ({stats.absent})
              </button>
            </div>

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 text-slate-800 border-none outline-none font-medium cursor-pointer"
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
                className="w-36 sm:w-44 pl-7 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 text-slate-900 placeholder-slate-400 outline-none focus:ring-1 focus:ring-brand"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>

            {/* Export buttons */}
            <button
              onClick={handleQuickExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all shadow-2xs"
              title="Exporter un fichier PDF officiel contenant les informations du jour"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>Exporter PDF du jour</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-muted font-bold border-b border-slate-100">
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
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Aucun pointage trouvé pour ces critères de filtre.
                  </td>
                </tr>
              ) : (
                filteredList.map((record) => {
                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-brand">
                        {record.employeeId}
                      </td>

                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar matricule={record.employeeId} name={record.employeeName} size={32} />
                          <div>
                            <span className="font-bold text-ink block">
                              {record.employeeName}
                            </span>
                            {record.isCorrected && (
                              <span className="text-[10px] text-amber-600 italic">
                                Corrigé ({record.correctionReason || 'vérifié'})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-slate-600">
                        {record.department}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono text-slate-500">
                        {record.expectedCheckIn}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold">
                        {record.actualCheckIn ? (
                          <span className={record.status === 'RETARD' ? 'text-amber-600' : 'text-slate-900'}>
                            {record.actualCheckIn}
                          </span>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono">
                        {record.lateMinutes > 0 ? (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            +{record.lateMinutes} min
                          </span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono text-slate-700">
                        {record.actualCheckOut || <span className="text-slate-300">–</span>}
                      </td>

                      {/* STRICT 3-STATUS BADGE */}
                      <td className="py-3 px-3.5 text-center">
                        <StatusBadge status={record.status} size="sm" />
                      </td>

                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => onOpenCorrectModal(record)}
                          className="p-1 rounded-lg text-slate-500 hover:text-brand hover:bg-slate-100 transition-colors"
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
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Affichage de {filteredList.length} sur {dayRecords.length} pointages enregistrés
          </span>
          <button
            onClick={() => setCurrentView('attendance')}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
          >
            Consulter le registre complet des présences →
          </button>
        </div>
      </div>
    </div>
  );
};
