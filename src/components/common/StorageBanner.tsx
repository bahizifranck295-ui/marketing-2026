import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const KEY_LABEL: Record<string, string> = {
  premidis_attendance: 'carnet des présences', premidis_employees: 'registre du personnel', premidis_users: 'comptes',
  premidis_roles: 'rôles', premidis_settings: 'paramètres', premidis_departments: 'départements',
  premidis_sanction_rules: 'barèmes de sanction', premidis_sanction_cases: 'dossiers de sanction',
  premidis_audit_logs: "journal d'audit", premidis_zkteco: 'pointeuse', premidis_working_date: 'date de travail',
};

/** Bandeau d'alerte : donnée illisible mise de côté, ou stockage plein (modifications non enregistrées) */
export const StorageBanner: React.FC = () => {
  const { storageIssues, dismissStorageIssues } = useApp();
  if (!storageIssues.length) return null;
  const full = storageIssues.some(i => i.kind === 'full');
  const corrupted = storageIssues.filter(i => i.kind === 'corrupted').map(i => KEY_LABEL[i.key] || i.key);
  const unavailable = storageIssues.some(i => i.kind === 'unavailable');
  return (
    <div className="mx-4 lg:mx-6 mt-3 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2" role="alert">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        {full && <p><b>Stockage du navigateur plein :</b> les dernières modifications ne sont pas enregistrées. Téléchargez une sauvegarde (Paramètres › Sauvegarde), puis archivez les anciens mois.</p>}
        {corrupted.length > 0 && <p><b>Données illisibles :</b> {corrupted.join(', ')}. Une copie a été conservée ; restaurez votre dernière sauvegarde (Paramètres › Sauvegarde).</p>}
        {unavailable && <p><b>Stockage indisponible</b> (navigation privée ?) : les modifications ne seront pas conservées après fermeture.</p>}
      </div>
      <button onClick={dismissStorageIssues} className="p-1 rounded hover:bg-amber-100" aria-label="Fermer l'alerte"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
};
