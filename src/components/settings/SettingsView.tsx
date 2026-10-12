import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UsersRolesPanel } from './UsersRolesPanel';
import { 
  Settings, Cpu, Building2, Users, ShieldCheck, 
  History, RefreshCw, CheckCircle2, AlertTriangle, 
  Upload, Download, FileText, Wifi, Lock, Server, Trash2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    companySettings, updateCompanySettings,
    departments, addDepartment, updateDepartment,
    zktecoConfig, updateZKTecoConfig, testZKTecoConnection, syncZKTecoNow, importZKTecoFile,
    auditLogs, allUsers, switchUserRole, currentUser 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ZKTECO' | 'COMPANY' | 'DEPARTMENTS' | 'AUDIT' | 'USERS'>('ZKTECO');

  // ZKTeco test state
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);

  // ZKTeco sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // File import state
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [importedFileContent, setImportedFileContent] = useState<string>('');
  const [fileImportResult, setFileImportResult] = useState<{ success: boolean; count: number; errors: string[] } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // New Department state
  const [newDepName, setNewDepName] = useState('');
  const [newDepCode, setNewDepCode] = useState('');
  const [newDepManager, setNewDepManager] = useState('');

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const res = await testZKTecoConnection();
    setTestResult(res);
    setTestingConnection(false);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncZKTecoNow();
      setSyncResult(`Synchronisation réussie ! ${res.punchesImported} pointages importés.`);
    } catch {
      setSyncResult('Échec de synchronisation avec l\'appareil.');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportedFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleProcessFileImport = async () => {
    if (!importedFileContent || !importedFileName) return;
    setIsProcessingFile(true);
    const res = await importZKTecoFile(importedFileName, importedFileContent);
    setFileImportResult(res);
    setIsProcessingFile(false);
  };

  const loadSampleZKTecoFile = () => {
    // Generate standard ZKTeco AttLog sample content
    const sample = `1\t2026-10-11 08:12:15\t1\t0
2\t2026-10-11 08:25:40\t1\t0
3\t2026-10-11 08:29:10\t1\t0
4\t2026-10-11 08:48:22\t1\t0
7\t2026-10-11 07:54:10\t1\t0
8\t2026-10-11 08:05:30\t1\t0
14\t2026-10-11 08:35:12\t1\t0
17\t2026-10-11 08:52:45\t1\t0
19\t2026-10-11 08:47:05\t1\t0`;
    setImportedFileName('AttLog_sample_ZKTeco.dat');
    setImportedFileContent(sample);
  };

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
        <h1 className="text-2xl font-black text-ink dark:text-white tracking-tight flex items-center gap-2">
          Paramètres du Système
        </h1>
        <p className="text-xs text-muted dark:text-gray-400 mt-1">
          Configuration de l'appareil biométrique ZKTeco, horaires de référence, départements et journal d'audit
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('ZKTECO')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ZKTECO'
              ? 'bg-brand text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Appareil ZKTeco</span>
        </button>

        <button
          onClick={() => setActiveTab('COMPANY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'COMPANY'
              ? 'bg-brand text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Entreprise & Horaires</span>
        </button>

        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'DEPARTMENTS'
              ? 'bg-brand text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Départements ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'USERS'
              ? 'bg-brand text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Utilisateurs & Rôles</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'AUDIT'
              ? 'bg-brand text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Journal d'Audit ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: ZKTECO DEVICE CONFIGURATION & FILE IMPORTER */}
      {activeTab === 'ZKTECO' && (
        <div className="space-y-6">
          {/* Hardware Connection Card */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-brand">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Pointeuse Biométrique ZKTeco
                  </h3>
                  <p className="text-xs text-gray-500">
                    Connexion réseau TCP/IP, protocole ZKEMkeeper ou synchronisation par fichier USB
                  </p>
                </div>
              </div>

              {/* Live Status Chip */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  zktecoConfig.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                  zktecoConfig.status === 'SYNCHRONIZING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                  'bg-rose-100 text-rose-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${zktecoConfig.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {zktecoConfig.status === 'ONLINE' ? 'Appareil Connecté' : 'Synchronisation...'}
                </span>
              </div>
            </div>

            {/* Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-gray-500 font-bold mb-1">Marque</label>
                <input
                  type="text"
                  disabled
                  value={zktecoConfig.brand}
                  className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">Modèle de l'appareil</label>
                <input
                  type="text"
                  value={zktecoConfig.model}
                  onChange={(e) => updateZKTecoConfig({ model: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">Adresse IP (LAN interne)</label>
                <input
                  type="text"
                  value={zktecoConfig.ipAddress}
                  onChange={(e) => updateZKTecoConfig({ ipAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold outline-none"
                  placeholder="192.168.1.201"
                />
              </div>

              <div>
                <label className="block text-gray-500 font-bold mb-1">Port de communication</label>
                <input
                  type="number"
                  value={zktecoConfig.port}
                  onChange={(e) => updateZKTecoConfig({ port: parseInt(e.target.value) || 4370 })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold outline-none"
                />
              </div>
            </div>

            {/* Test and Sync Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-50 transition-all shadow-2xs disabled:opacity-50"
              >
                <Wifi className={`w-3.5 h-3.5 text-brand ${testingConnection ? 'animate-pulse' : ''}`} />
                <span>{testingConnection ? 'Test réseau en cours...' : 'Tester la connexion TCP'}</span>
              </button>

              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand-deep transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Import des pointages...' : 'Synchroniser maintenant'}</span>
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in ${
                testResult.success 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {syncResult && (
              <div className="p-3.5 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{syncResult}</span>
              </div>
            )}
          </div>

          {/* USB / FILE IMPORTER FOR ZKTECO (Crucial fallback when device is not reachable via LAN) */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-brand" />
                  Importateur de Fichiers de Pointage ZKTeco (USB / DAT / CSV)
                </h3>
                <p className="text-xs text-gray-500">
                  Importez les fichiers extraits par clé USB sur la machine (formats ZKTeco `AttLog.dat`, `attendance.csv`, etc.)
                </p>
              </div>

              <button
                onClick={loadSampleZKTecoFile}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                title="Charger un échantillon réel de pointages ZKTeco pour démonstration"
              >
                Charger échantillon ZKTeco
              </button>
            </div>

            {/* Drop / Select zone */}
            <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-center space-y-2">
              <input
                type="file"
                accept=".dat,.csv,.txt,.log"
                onChange={handleFileDrop}
                id="zk-file-upload"
                className="hidden"
              />
              <label 
                htmlFor="zk-file-upload" 
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-brand font-bold text-xs hover:bg-purple-100 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Choisir un fichier USB ZKTeco (AttLog.dat ou .csv)
              </label>

              {importedFileName && (
                <div className="pt-2 text-xs font-mono text-gray-600 dark:text-gray-300">
                  Fichier sélectionné : <b className="text-brand">{importedFileName}</b> ({importedFileContent.split('\n').length} lignes)
                </div>
              )}
            </div>

            {/* Preview of file content if loaded */}
            {importedFileContent && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Aperçu du contenu brut de la pointeuse :</p>
                <pre className="p-3 rounded-xl bg-gray-900 text-green-400 font-mono text-[11px] max-h-32 overflow-y-auto">
                  {importedFileContent}
                </pre>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleProcessFileImport}
                    disabled={isProcessingFile}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valider et importer les pointages dans le carnet</span>
                  </button>
                </div>
              </div>
            )}

            {fileImportResult && (
              <div className={`p-4 rounded-xl text-xs space-y-2 ${
                fileImportResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}>
                <p className="font-bold">
                  {fileImportResult.count} pointages insérés avec succès dans le registre !
                </p>
                {fileImportResult.errors.length > 0 && (
                  <div className="text-[11px] space-y-1">
                    <p className="font-semibold text-rose-700">Avertissements ({fileImportResult.errors.length}) :</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {fileImportResult.errors.slice(0, 4).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sync History Logs */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Historique des Synchronisations & Événements Appareil
            </h3>

            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-bold border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">Horodatage</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Pointages</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                    <th className="py-2.5 px-3">Détails / Protocole</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {zktecoConfig.syncLogs.map(log => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-bold">{log.type.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-brand">+{log.punchesImported}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY & DEFAULT SCHEDULES */}
      {activeTab === 'COMPANY' && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Identité de PREMIDIS SARL & Horaires Officiels
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-500 font-bold mb-1">Raison sociale</label>
              <input
                type="text"
                value={companySettings.companyName}
                onChange={(e) => updateCompanySettings({ companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-bold mb-1">Sous-titre / Activité</label>
              <input
                type="text"
                value={companySettings.companySubName}
                onChange={(e) => updateCompanySettings({ companySubName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-bold mb-1">Adresse complète</label>
              <input
                type="text"
                value={companySettings.address}
                onChange={(e) => updateCompanySettings({ address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-bold mb-1">Numéro RCCM officiel</label>
              <input
                type="text"
                value={companySettings.rccm}
                onChange={(e) => updateCompanySettings({ rccm: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-bold mb-1">Téléphone de contact</label>
              <input
                type="text"
                value={companySettings.phone}
                onChange={(e) => updateCompanySettings({ phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-bold mb-1">WhatsApp officiel</label>
              <input
                type="text"
                value={companySettings.whatsapp}
                onChange={(e) => updateCompanySettings({ whatsapp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono outline-none"
              />
            </div>
          </div>

          {/* Reference schedules */}
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
            <h4 className="text-xs font-bold text-brand uppercase tracking-wider">
              Horaires Généraux & Calcul Automatique
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Arrivée au plus tard (Entrée)</label>
                <input
                  type="time"
                  value={companySettings.defaultExpectedCheckIn}
                  onChange={(e) => updateCompanySettings({ defaultExpectedCheckIn: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Fin de service (Sortie)</label>
                <input
                  type="time"
                  value={companySettings.defaultExpectedCheckOut}
                  onChange={(e) => updateCompanySettings({ defaultExpectedCheckOut: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold text-center"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Tolérance autorisée (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={companySettings.defaultToleranceMinutes}
                  onChange={(e) => updateCompanySettings({ defaultToleranceMinutes: parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold text-center"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 italic">
              Règle : Tout pointage enregistré après l'heure d'entrée + la tolérance est automatiquement qualifié en statut « Retard ».
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Départements de PREMIDIS SARL
            </h3>
          </div>

          <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
            <div>
              <label className="block text-gray-500 font-bold mb-1">Nom du département</label>
              <input
                type="text"
                required
                placeholder="ex. Sécurité & Gardiennage"
                value={newDepName}
                onChange={(e) => setNewDepName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-bold mb-1">Code</label>
              <input
                type="text"
                required
                placeholder="SEC"
                value={newDepCode}
                onChange={(e) => setNewDepCode(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-gray-500 font-bold mb-1">Responsable</label>
              <input
                type="text"
                placeholder="Chef de département"
                value={newDepManager}
                onChange={(e) => setNewDepManager(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none"
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
          </form>

          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Département</th>
                  <th className="py-2.5 px-3">Responsable</th>
                  <th className="py-2.5 px-3 text-center">Horaires par défaut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {departments.map(dep => (
                  <tr key={dep.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand">{dep.code}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">{dep.name}</td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{dep.manager}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-500">{dep.defaultEntrance} - {dep.defaultExit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: USERS & ROLES */}
      {activeTab === 'USERS' && <UsersRolesPanel />}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Journal d'Audit & Traçabilité des Opérations
            </h3>
            <span className="text-xs font-mono text-gray-400">
              {auditLogs.length} événements enregistrés
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">Utilisateur</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Cible</th>
                  <th className="py-2.5 px-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-800 dark:text-gray-200">{log.userName}</td>
                    <td className="py-2.5 px-3 font-mono text-brand">{log.action}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-700 dark:text-gray-300">{log.target}</td>
                    <td className="py-2.5 px-3 text-gray-500">{log.details}</td>
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
