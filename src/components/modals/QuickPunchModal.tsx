import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Fingerprint, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface QuickPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickPunchModal: React.FC<QuickPunchModalProps> = ({ isOpen, onClose }) => {
  const { employees, recordPunch } = useApp();

  const [selectedMatricule, setSelectedMatricule] = useState(employees[0]?.matricule || '');
  const [punchType, setPunchType] = useState<'IN' | 'OUT'>('IN');
  const [punchTime, setPunchTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(e =>
    `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    e.matricule.toLowerCase().includes(searchEmployee.toLowerCase())
  );

  const selectedEmp = employees.find(e => e.matricule === selectedMatricule);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatricule) return;

    recordPunch(selectedMatricule, punchTime, punchType === 'OUT', notes);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1200);
  };

  const setNow = () => {
    const now = new Date();
    setPunchTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-brand">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Enregistrement Rapide de Pointage
              </h2>
              <p className="text-[11px] text-slate-500">Poste de garde & Secrétariat PREMIDIS</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-slate-900">Pointage Enregistré avec Succès !</p>
            <p className="text-xs text-slate-500">{selectedEmp?.nom} ({selectedMatricule}) à {punchTime}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Punch Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl font-bold">
              <button
                type="button"
                onClick={() => setPunchType('IN')}
                className={`py-2 rounded-lg text-center transition-all ${
                  punchType === 'IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Arrivée (Entrée)
              </button>
              <button
                type="button"
                onClick={() => setPunchType('OUT')}
                className={`py-2 rounded-lg text-center transition-all ${
                  punchType === 'OUT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Départ (Sortie)
              </button>
            </div>

            {/* Employee Search & Selector */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Sélectionner l'employé *
              </label>
              <input
                type="text"
                placeholder="Filtrer par nom ou matricule..."
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="w-full px-3 py-1.5 mb-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none"
              />
              <select
                value={selectedMatricule}
                onChange={(e) => setSelectedMatricule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold"
              >
                {filteredEmployees.map(e => (
                  <option key={e.id} value={e.matricule}>
                    {e.matricule} – {e.nom} {e.prenom} ({e.departement})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Employee Expected Schedule Info */}
            {selectedEmp && (
              <div className="p-2.5 rounded-xl bg-purple-50/60 text-[11px] text-brand flex items-center justify-between font-semibold">
                <span>Horaire prévu : {selectedEmp.heureEntreeNormale} - {selectedEmp.heureSortieNormale}</span>
                <span>Tolérance : {selectedEmp.toleranceMinutes} min</span>
              </div>
            )}

            {/* Time input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-600 font-bold">Heure du pointage (HH:mm) *</label>
                <button
                  type="button"
                  onClick={setNow}
                  className="text-[11px] text-brand font-bold hover:underline"
                >
                  Remplir heure actuelle
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  required
                  value={punchTime}
                  onChange={(e) => setPunchTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono font-bold text-center text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">Observation / Justification éventuelle</label>
              <input
                type="text"
                placeholder="ex. Pointage relevé à la barrière manuellement"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand text-white font-bold hover:bg-brand-deep shadow-sm"
              >
                Valider le Pointage
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
