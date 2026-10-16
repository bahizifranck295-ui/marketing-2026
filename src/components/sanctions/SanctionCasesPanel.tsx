import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import { SANCTION_LABELS } from '../../types';
import { evaluateSanctions, sanctionText, type SanctionProposal } from '../../utils/sanctions';
import { Calendar, CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react';

const monthLabel = (m: string) => {
  const label = new Date(`${m}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Dossiers de sanction du mois : chaque employé qui a atteint un barème actif est proposé à la Direction,
 * qui valide ou rejette avec un motif. Le calcul est le même que le tableau de bord et le rapport.
 */
export const SanctionCasesPanel: React.FC = () => {
  const { employees, attendanceRecords, sanctionRules, sanctionCases, workingDate, decideSanction, can, openEmployeeCarnet } = useApp();
  const canValidate = can('sanctions', 'validate');
  const [month, setMonth] = useState(workingDate.slice(0, 7));
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [deciding, setDeciding] = useState<{ matricule: string; status: 'APPROUVEE' | 'REJETEE' } | null>(null);
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');

  // Mois en cours : jusqu'au jour de travail ; mois passé : mois complet
  const upTo = month === workingDate.slice(0, 7) ? workingDate : undefined;
  const proposals = useMemo(
    () => evaluateSanctions(employees, attendanceRecords, sanctionRules, month, upTo, sanctionCases),
    [employees, attendanceRecords, sanctionRules, sanctionCases, month, upTo]);
  const pending = proposals.filter(p => !p.decision).length;
  const shown = filter === 'PENDING' ? proposals.filter(p => !p.decision) : proposals;

  const confirm = (p: SanctionProposal) => {
    if (!deciding) return;
    if (!motif.trim()) { setError('Indiquez le motif de la décision.'); return; }
    decideSanction(p, deciding.status, motif.trim());
    setDeciding(null); setMotif(''); setError('');
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-brand" /> Dossiers de sanction · {monthLabel(month)}
          </h2>
          <p className="text-[11px] text-slate-500">
            {proposals.length} employé{proposals.length > 1 ? 's' : ''} au-dessus d'un seuil · <b className="text-amber-700">{pending} à valider</b>
            {upTo ? ` · calcul jusqu'au ${upTo.split('-').reverse().join('/')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="p-1 bg-slate-100 rounded-xl flex font-bold">
            <button onClick={() => setFilter('PENDING')} className={`px-3 py-1 rounded-lg ${filter === 'PENDING' ? 'bg-white text-brand shadow-xs' : 'text-slate-500'}`}>À valider ({pending})</button>
            <button onClick={() => setFilter('ALL')} className={`px-3 py-1 rounded-lg ${filter === 'ALL' ? 'bg-white text-brand shadow-xs' : 'text-slate-500'}`}>Tous ({proposals.length})</button>
          </div>
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            <input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} className="bg-transparent outline-none font-mono font-semibold" aria-label="Mois des dossiers" />
          </label>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          {proposals.length === 0 ? 'Aucun employé n\'a atteint un seuil de sanction ce mois-ci.' : 'Tous les dossiers de ce mois ont été traités.'}
        </p>
      ) : (
        <div className="rounded-xl border border-slate-100 divide-y divide-slate-100">
          {shown.map(p => {
            const isDeciding = deciding?.matricule === p.emp.matricule;
            return (
              <div key={p.emp.matricule} className="p-3 flex flex-col lg:flex-row lg:items-center gap-3 text-xs">
                <div className="flex items-center gap-2.5 lg:w-[30%] min-w-0">
                  <EmployeeAvatar matricule={p.emp.matricule} size={38} />
                  <div className="min-w-0">
                    <button onClick={() => openEmployeeCarnet(p.emp.matricule)} className="font-bold text-slate-900 hover:text-brand hover:underline text-left">
                      {p.emp.nom} {p.emp.postnom} {p.emp.prenom}
                    </button>
                    <p className="text-[10px] text-slate-500">{p.emp.matricule} · {p.emp.departement}</p>
                  </div>
                </div>
                <div className="lg:w-[22%] text-[11px] text-slate-600">
                  <p><b className="text-amber-600">{p.lateCount} retard{p.lateCount > 1 ? 's' : ''}</b> ({p.lateMinutes} min) · <b className="text-rose-600">{p.absences} absence{p.absences > 1 ? 's' : ''}</b></p>
                  <p className="text-slate-400">{p.rule.name}</p>
                </div>
                <div className="lg:w-[20%]">
                  <span className="inline-block px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">{sanctionText(p.rule, SANCTION_LABELS)}</span>
                  {p.rule.deductionAmount > 0 && <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Retenue {p.rule.deductionAmount} {p.rule.currency}</p>}
                </div>
                <div className="flex-1 flex flex-wrap items-center justify-end gap-2">
                  {p.decision ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] ${p.decision.status === 'APPROUVEE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`} title={p.decision.decisionMotif}>
                      {p.decision.status === 'APPROUVEE' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {p.decision.status === 'APPROUVEE' ? 'Validée' : 'Rejetée'} le {p.decision.decisionDate}
                    </span>
                  ) : isDeciding ? (
                    <div className="w-full lg:w-auto flex flex-wrap items-center gap-2">
                      <input
                        autoFocus
                        value={motif}
                        onChange={e => { setMotif(e.target.value); setError(''); }}
                        placeholder={deciding?.status === 'APPROUVEE' ? 'Motif de la validation' : 'Motif du rejet (justificatif, erreur…)'}
                        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none"
                        aria-label="Motif de la décision"
                        onKeyDown={e => { if (e.key === 'Enter') confirm(p); if (e.key === 'Escape') setDeciding(null); }}
                      />
                      <button onClick={() => confirm(p)} className={`px-3 py-1.5 rounded-xl text-white font-bold ${deciding?.status === 'APPROUVEE' ? 'bg-emerald-600' : 'bg-slate-700'}`}>Confirmer</button>
                      <button onClick={() => { setDeciding(null); setError(''); }} className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600">Annuler</button>
                      {error && <p className="w-full text-rose-600 font-semibold" role="alert">{error}</p>}
                    </div>
                  ) : canValidate ? (
                    <>
                      <button onClick={() => { setDeciding({ matricule: p.emp.matricule, status: 'APPROUVEE' }); setMotif(''); }} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold">Valider</button>
                      <button onClick={() => { setDeciding({ matricule: p.emp.matricule, status: 'REJETEE' }); setMotif(''); }} className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-700">Rejeter</button>
                    </>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[11px]">À valider par la Direction</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
