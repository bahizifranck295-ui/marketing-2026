import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import { StatusBadge } from '../common/Badge';
import { AttendanceRecord } from '../../types';
import { ArrowLeft, Calendar, Edit3 } from 'lucide-react';

interface EmployeeCarnetProps {
  matricule: string;
  onClose: () => void;
  onOpenCorrectModal: (record: AttendanceRecord) => void;
}

const SOURCE_LABEL = { ZKTECO_BIOMETRIC: 'Biométrie', FILE_IMPORT: 'Clé USB', MANUAL: 'Manuel' } as const;

/** Carnet de présence d'un seul agent : fiche, bilan du mois et pointages jour par jour */
export const EmployeeCarnet: React.FC<EmployeeCarnetProps> = ({ matricule, onClose, onOpenCorrectModal }) => {
  const { employees, attendanceRecords, workingDate } = useApp();
  const emp = employees.find(e => e.matricule === matricule);
  const [month, setMonth] = useState(workingDate.slice(0, 7));

  const records = useMemo(
    () => attendanceRecords.filter(r => r.employeeId === matricule && r.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date)),
    [attendanceRecords, matricule, month]
  );
  const stats = useMemo(() => {
    const present = records.filter(r => r.status === 'PRESENT').length;
    const late = records.filter(r => r.status === 'RETARD');
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const worked = present + late.length;
    return {
      present, late: late.length, absent,
      lateMinutes: late.reduce((n, r) => n + r.lateMinutes, 0),
      punctuality: worked ? Math.round((present / worked) * 100) : 100,
    };
  }, [records]);

  if (!emp) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-slate-600">
        Agent introuvable.{' '}
        <button onClick={onClose} className="font-bold text-brand hover:underline">Retour au carnet général</button>
      </div>
    );
  }

  const dayLabel = (d: string) => {
    const label = new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700">
          <ArrowLeft className="w-3.5 h-3.5" /> Carnet général
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <Calendar className="w-3.5 h-3.5 text-brand" />
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="bg-transparent outline-none font-mono cursor-pointer text-slate-900 font-semibold" aria-label="Mois du carnet" />
        </div>
      </div>

      {/* Fiche de l'agent */}
      <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <EmployeeAvatar matricule={emp.matricule} size={72} rounded="xl" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Carnet de présence</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">{emp.nom} {emp.postnom} {emp.prenom}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{emp.poste} · {emp.departement}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              {emp.matricule} · ID pointeuse {emp.zktecoBioId} · Horaire {emp.heureEntreeNormale} – {emp.heureSortieNormale} · Tolérance {emp.toleranceMinutes} min
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center md:w-[420px]">
          {[
            { label: 'Présences', value: stats.present, cls: 'text-emerald-600' },
            { label: 'Retards', value: `${stats.late}`, sub: `${stats.lateMinutes} min`, cls: 'text-amber-600' },
            { label: 'Absences', value: stats.absent, cls: 'text-rose-600' },
            { label: 'Ponctualité', value: `${stats.punctuality} %`, cls: 'text-brand' },
          ].map(k => (
            <div key={k.label} className="rounded-xl bg-slate-50 border border-slate-100 px-2 py-2.5">
              <p className={`text-lg font-black ${k.cls}`}>{k.value}</p>
              <p className="text-[10px] font-semibold text-slate-500">{k.label}{k.sub ? ` · ${k.sub}` : ''}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pointages du mois */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Pointages du mois ({records.length} jour{records.length > 1 ? 's' : ''})</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Entrée prévue</th>
                <th className="py-2.5 px-3 text-center">Entrée</th>
                <th className="py-2.5 px-3 text-center">Sortie</th>
                <th className="py-2.5 px-3 text-center">Retard</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3">Source / remarque</th>
                <th className="py-2.5 px-3 text-right">Corriger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">Aucun pointage ce mois-ci.</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{dayLabel(r.date)}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{r.expectedCheckIn}</td>
                  <td className={`py-2.5 px-3 text-center font-mono font-bold ${r.status === 'RETARD' ? 'text-amber-600' : 'text-slate-900'}`}>{r.actualCheckIn ?? '—'}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{r.actualCheckOut ?? '—'}</td>
                  <td className="py-2.5 px-3 text-center font-mono">{r.lateMinutes > 0 ? `+${r.lateMinutes} min` : '—'}</td>
                  <td className="py-2.5 px-3 text-center"><StatusBadge status={r.status} size="sm" /></td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-[260px] truncate" title={r.notes}>
                    {SOURCE_LABEL[r.source]}{r.isCorrected ? ' · corrigé' : ''}{r.notes ? ` · ${r.notes}` : ''}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => onOpenCorrectModal(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-purple-50" title="Corriger ce pointage" aria-label={`Corriger le pointage du ${r.date}`}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
