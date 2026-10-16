import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { downloadText, readAllAppData } from '../../utils/storage';
import { AlertTriangle, Download, Eraser, Upload } from 'lucide-react';

const APP = 'PREMIDIS Attendance';
const today = () => new Date().toISOString().slice(0, 10);

/** Fichier de sauvegarde : toutes les clés « premidis_ » du navigateur */
const backupText = () => JSON.stringify({ app: APP, exportedAt: new Date().toISOString(), data: readAllAppData() }, null, 1);

/** Données de l'entreprise effacées au démarrage à vide ; comptes, rôles, paramètres et barèmes sont gardés */
const BUSINESS_KEYS = ['premidis_employees', 'premidis_attendance', 'premidis_sanction_cases', 'premidis_audit_logs'];

type Pending = { kind: 'restore'; fileName: string; exportedAt: string; data: Record<string, string>; summary: string } | { kind: 'reset' };

const count = (data: Record<string, string>, key: string) => {
  try { const v = JSON.parse(data[key] ?? '[]'); return Array.isArray(v) ? v.length : 0; } catch { return 0; }
};

/**
 * Sauvegarde et restauration des données du navigateur, et démarrage à vide (sans données de démonstration).
 * Les données restent dans ce navigateur : la sauvegarde régulière est la seule protection contre leur perte.
 */
export const BackupPanel: React.FC = () => {
  const { employees, attendanceRecords, addAuditLog } = useApp();
  const [pending, setPending] = useState<Pending | null>(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');

  const download = () => {
    downloadText(`sauvegarde_premidis_${today()}.json`, backupText());
    addAuditLog('SAUVEGARDE_EXPORTEE', 'Paramètres', `Sauvegarde téléchargée (${employees.length} employés, ${attendanceRecords.length} pointages)`);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(''); setPending(null);
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== APP || typeof parsed.data !== 'object' || !parsed.data) throw new Error('Ce fichier n\'est pas une sauvegarde PREMIDIS Attendance.');
      const data: Record<string, string> = {};
      Object.entries(parsed.data as Record<string, unknown>).forEach(([k, v]) => {
        if (!k.startsWith('premidis_') || typeof v !== 'string') throw new Error(`Contenu inattendu dans la sauvegarde (${k}).`);
        JSON.parse(v); // chaque valeur doit être lisible
        data[k] = v;
      });
      if (!data.premidis_employees) throw new Error('La sauvegarde ne contient pas la liste des employés.');
      setPending({
        kind: 'restore', fileName: file.name, exportedAt: String(parsed.exportedAt ?? '').slice(0, 16).replace('T', ' '), data,
        summary: `${count(data, 'premidis_employees')} employés · ${count(data, 'premidis_attendance')} pointages · ${count(data, 'premidis_sanction_cases')} décisions de sanction · ${count(data, 'premidis_users')} comptes`,
      });
      setTyped('');
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Fichier illisible : ce n\'est pas une sauvegarde valide.' : (err as Error).message);
    }
  };

  /** Applique la restauration ou l'effacement, après une sauvegarde automatique de l'état actuel */
  const apply = () => {
    if (!pending) return;
    downloadText(`avant_${pending.kind === 'restore' ? 'restauration' : 'effacement'}_premidis_${today()}.json`, backupText());
    try {
      if (pending.kind === 'restore') {
        Object.keys(readAllAppData()).forEach(k => localStorage.removeItem(k));
        Object.entries(pending.data).forEach(([k, v]) => localStorage.setItem(k, v));
      } else {
        BUSINESS_KEYS.forEach(k => localStorage.setItem(k, '[]'));
        localStorage.setItem('premidis_working_date', JSON.stringify(today()));
      }
    } catch {
      setError('Le navigateur a refusé l\'écriture (stockage plein ou bloqué). Rien n\'a été appliqué partiellement : rechargez la page puis réessayez.');
      return;
    }
    // Relance l'application sur les nouvelles données (une nouvelle connexion est demandée)
    setTimeout(() => window.location.reload(), 300);
  };

  const word = pending?.kind === 'reset' ? 'EFFACER' : 'RESTAURER';

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Download className="w-4 h-4 text-brand" /> Sauvegarde des données</h2>
        <p className="text-xs text-slate-600">
          Les données sont enregistrées dans ce navigateur uniquement. Téléchargez une sauvegarde chaque semaine (et avant de vider le navigateur
          ou de changer d'ordinateur) et rangez-la en lieu sûr : clé USB, disque partagé.
        </p>
        <p className="text-[11px] text-slate-500">Actuellement : {employees.length} employés · {attendanceRecords.length} pointages.</p>
        <button onClick={download} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold">
          <Download className="w-3.5 h-3.5" /> Télécharger une sauvegarde
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Upload className="w-4 h-4 text-brand" /> Restaurer une sauvegarde</h2>
        <p className="text-xs text-slate-600">Remplace toutes les données de ce navigateur par celles du fichier. L'état actuel est d'abord téléchargé automatiquement.</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
          <Upload className="w-3.5 h-3.5" /> Choisir le fichier de sauvegarde (.json)
          <input id="backup-file" type="file" accept=".json,application/json" className="hidden" onChange={pickFile} />
        </label>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eraser className="w-4 h-4 text-rose-600" /> Démarrer à vide</h2>
        <p className="text-xs text-slate-600">
          Efface les employés, pointages, décisions de sanction et le journal (données de démonstration comprises) pour commencer avec les vraies données.
          Les comptes, rôles, paramètres de l'entreprise, départements et barèmes de sanction sont conservés.
        </p>
        <button onClick={() => { setPending({ kind: 'reset' }); setTyped(''); setError(''); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold">
          <Eraser className="w-3.5 h-3.5" /> Effacer les données
        </button>
      </div>

      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">{error}</p>}

      {pending && (
        <div role="dialog" aria-label="Confirmation" className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50 text-xs space-y-3" data-backup-confirm>
          <p className="font-bold text-amber-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />
            {pending.kind === 'restore' ? `Restaurer « ${pending.fileName} »${pending.exportedAt ? ` (sauvegarde du ${pending.exportedAt})` : ''} ?` : 'Effacer toutes les données de l\'entreprise ?'}
          </p>
          {pending.kind === 'restore' && <p className="text-amber-900">Contenu : {pending.summary}. Les données actuelles seront remplacées.</p>}
          <p className="text-amber-900">Une copie de l'état actuel sera téléchargée avant, puis l'application redémarre (reconnexion). Tapez <b>{word}</b> pour confirmer.</p>
          <div className="flex flex-wrap gap-2">
            <input value={typed} onChange={e => setTyped(e.target.value)} aria-label={`Tapez ${word}`} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none font-mono" />
            <button disabled={typed.trim().toUpperCase() !== word} onClick={apply} className="px-4 py-1.5 rounded-xl bg-rose-600 text-white font-bold disabled:opacity-40">Confirmer</button>
            <button onClick={() => setPending(null)} className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
};
