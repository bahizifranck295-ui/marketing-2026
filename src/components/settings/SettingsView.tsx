import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UsersRolesPanel } from './UsersRolesPanel';
import { UsbImportPanel } from './UsbImportPanel';
import { BackupPanel } from './BackupPanel';
import { Cpu, Building2, Users, ShieldCheck, History, HardDriveDownload } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    companySettings, updateCompanySettings,
    departments, addDepartment,
    zktecoConfig, updateZKTecoConfig,
    auditLogs, can
  } = useApp();
  const canViewSettings = can('settings');
  const canEditSettings = can('settings', 'edit');
  const canCreateSettings = can('settings', 'create');
  const canImport = can('attendance', 'create');

  const [activeTab, setActiveTab] = useState<'ZKTECO' | 'COMPANY' | 'DEPARTMENTS' | 'AUDIT' | 'USERS' | 'BACKUP'>('ZKTECO');

  // New Department state
  const [newDepName, setNewDepName] = useState('');
  const [newDepCode, setNewDepCode] = useState('');
  const [newDepManager, setNewDepManager] = useState('');

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepName || !newDepCode) return;
    addDepartment({
      name: newDepName,
      code: newDepCode.toUpperCase(),
      manager: newDepManager || 'À désigner',
      defaultEntrance: '08:30',
      defaultExit: '16:30'
    });
    setNewDepName('');
    setNewDepCode('');
    setNewDepManager('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          Paramètres du Système
        </h1>
        <p className="text-xs text-muted mt-1">
          Configuration de l'appareil biométrique ZKTeco, horaires de référence, départements et journal d'audit
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ZKTECO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ZKTECO'
              ? 'bg-brand text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Appareil ZKTeco</span>
        </button>

        {canViewSettings && (
          <button
            onClick={() => setActiveTab('COMPANY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'COMPANY'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Entreprise & Horaires</span>
          </button>
        )}

        {canViewSettings && (
          <button
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'DEPARTMENTS'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Départements ({departments.length})</span>
          </button>
        )}

        {canViewSettings && (
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'USERS'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Utilisateurs & Rôles</span>
          </button>
        )}

        {canViewSettings && (
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Journal d'Audit ({auditLogs.length})</span>
          </button>
        )}

        {canEditSettings && (
          <button
            onClick={() => setActiveTab('BACKUP')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'BACKUP'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HardDriveDownload className="w-3.5 h-3.5" />
            <span>Sauvegarde</span>
          </button>
        )}
      </div>

      {/* TAB 1: ZKTECO DEVICE CONFIGURATION & FILE IMPORTER */}
      {activeTab === 'ZKTECO' && (
        <div className="space-y-6">
          {/* Pointeuse : les données arrivent uniquement par la clé USB (aucune connexion réseau) */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-brand">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pointeuse biométrique ZKTeco</h3>
                <p className="text-xs text-slate-500">
                  Les pointages sont récupérés sur la pointeuse par clé USB, puis importés ci-dessous. L'application ne se connecte pas à l'appareil.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label htmlFor="zk-model" className="block text-slate-500 font-bold mb-1">Modèle de l'appareil</label>
                <input
                  id="zk-model"
                  type="text"
                  defaultValue={zktecoConfig.model}
                  disabled={!canEditSettings}
                  onBlur={(e) => { if (e.target.value.trim() && e.target.value !== zktecoConfig.model) updateZKTecoConfig({ model: e.target.value.trim() }); }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold outline-none"
                />
              </div>
              <div>
                <p className="block text-slate-500 font-bold mb-1">Dernier import</p>
                <p className="px-3 py-2 rounded-xl bg-slate-100 font-mono font-bold text-slate-800">{zktecoConfig.lastPunchImportedTime || '—'}</p>
              </div>
              <div>
                <p className="block text-slate-500 font-bold mb-1">Journées importées (total)</p>
                <p className="px-3 py-2 rounded-xl bg-slate-100 font-mono font-bold text-slate-800">{zktecoConfig.importedPunchesCount}</p>
              </div>
            </div>
          </div>

          {canImport ? <UsbImportPanel /> : (
            <p className="glass-card rounded-2xl p-5 text-xs text-slate-500">L'import du fichier de la pointeuse est réservé aux rôles autorisés à créer des présences.</p>
          )}

          {/* Sync History Logs */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Historique des imports de la pointeuse
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Horodatage</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Pointages</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                    <th className="py-2.5 px-3">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {zktecoConfig.syncLogs.map(log => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-bold">{log.type.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-brand">+{log.punchesImported}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY & DEFAULT SCHEDULES */}
      {activeTab === 'COMPANY' && canViewSettings && (
        <fieldset disabled={!canEditSettings} className="glass-card rounded-2xl p-6 space-y-5 disabled:opacity-90">
          <h3 className="text-base font-bold text-slate-900">
            Identité de PREMIDIS SARL & Horaires Officiels
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Raison sociale</label>
              <input
                type="text"
                defaultValue={companySettings.companyName}
                onBlur={(e) => { if (e.target.value !== companySettings.companyName) updateCompanySettings({ companyName: e.target.value }); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Sous-titre / Activité</label>
              <input
                type="text"
                defaultValue={companySettings.companySubName}
                onBlur={(e) => { if (e.target.value !== companySettings.companySubName) updateCompanySettings({ companySubName: e.target.value }); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Adresse complète</label>
              <input
                type="text"
                defaultValue={companySettings.address}
                onBlur={(e) => { if (e.target.value !== companySettings.address) updateCompanySettings({ address: e.target.value }); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Numéro RCCM officiel</label>
              <input
                type="text"
                defaultValue={companySettings.rccm}
                onBlur={(e) => { if (e.target.value !== companySettings.rccm) updateCompanySettings({ rccm: e.target.value }); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Téléphone de contact</label>
              <input
                type="text"
                defaultValue={companySettings.phone}
                onBlur={(e) => { if (e.target.value !== companySettings.phone) updateCompanySettings({ phone: e.target.value }); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">WhatsApp officiel</label>
              <input
                type="text"
                defaultValue={companySettings.whatsapp}
                onBlur={(e) => { if (e.target.value !== companySettings.whatsapp) updateCompanySettings({ whatsapp: e.target.value }); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label htmlFor="company-email" className="block text-slate-500 font-bold mb-1">E-mail officiel (affiché dans « Mot de passe oublié »)</label>
              <input
                id="company-email"
                type="email"
                defaultValue={companySettings.email}
                onBlur={(e) => { if (e.target.value !== companySettings.email) updateCompanySettings({ email: e.target.value.trim() }); }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none"
              />
            </div>
          </div>

          {/* Reference schedules */}
          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
            <h4 className="text-xs font-bold text-brand uppercase tracking-wider">
              Horaires Généraux & Calcul Automatique
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Arrivée au plus tard (Entrée)</label>
                <input
                  type="time"
                  defaultValue={companySettings.defaultExpectedCheckIn}
                  onBlur={(e) => { if (e.target.value !== companySettings.defaultExpectedCheckIn) updateCompanySettings({ defaultExpectedCheckIn: e.target.value }); }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Fin de service (Sortie)</label>
                <input
                  type="time"
                  defaultValue={companySettings.defaultExpectedCheckOut}
                  onBlur={(e) => { if (e.target.value !== companySettings.defaultExpectedCheckOut) updateCompanySettings({ defaultExpectedCheckOut: e.target.value }); }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Tolérance autorisée (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  defaultValue={companySettings.defaultToleranceMinutes}
                  onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v !== companySettings.defaultToleranceMinutes) updateCompanySettings({ defaultToleranceMinutes: v }); }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-mono font-bold text-center"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Règle : Tout pointage enregistré après l'heure d'entrée + la tolérance est automatiquement qualifié en statut « Retard ».
            </p>
          </div>
        </fieldset>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'DEPARTMENTS' && canViewSettings && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Départements de PREMIDIS SARL
            </h3>
          </div>

          {canCreateSettings && <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs p-3 rounded-xl bg-slate-50">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Nom du département</label>
              <input
                type="text"
                required
                placeholder="ex. Sécurité & Gardiennage"
                value={newDepName}
                onChange={(e) => setNewDepName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Code</label>
              <input
                type="text"
                required
                placeholder="SEC"
                value={newDepCode}
                onChange={(e) => setNewDepCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Responsable</label>
              <input
                type="text"
                placeholder="Chef de département"
                value={newDepManager}
                onChange={(e) => setNewDepManager(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-deep"
              >
                + Ajouter département
              </button>
            </div>
          </form>}

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Département</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-center">Horaires par défaut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {departments.map(dep => (
                  <tr key={dep.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand">{dep.code}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{dep.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{dep.manager}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{dep.defaultEntrance} - {dep.defaultExit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & ROLES */}
      {activeTab === 'USERS' && canViewSettings && <UsersRolesPanel />}

      {activeTab === 'BACKUP' && canEditSettings && <BackupPanel />}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'AUDIT' && canViewSettings && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Journal d'Audit & Traçabilité des Opérations
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {auditLogs.length} événements enregistrés
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">Utilisateur</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Cible</th>
                  <th className="py-2.5 px-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{log.userName}</td>
                    <td className="py-2.5 px-3 font-mono text-brand">{log.action}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{log.target}</td>
                    <td className="py-2.5 px-3 text-slate-500">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
