import React, { useState, useEffect } from 'react';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import { useApp, AppView } from '../../context/AppContext';
import { Search, Building2, Calendar, FileText, ArrowRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { employees, departments, setCurrentView } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle search
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const matchedEmployees = query.trim() ? employees.filter(e =>
    `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(query.toLowerCase()) ||
    e.matricule.toLowerCase().includes(query.toLowerCase()) ||
    e.poste.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5) : [];

  const matchedDepartments = query.trim() ? departments.filter(d =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.code.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3) : [];

  const handleSelectView = (view: AppView) => {
    setCurrentView(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="glass-card rounded-2xl w-full max-w-lg p-4 shadow-2xl animate-in fade-in zoom-in-95 space-y-3 text-xs">
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-100 rounded-xl">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            placeholder="Rechercher employé, matricule, département..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm font-medium text-slate-900 placeholder-slate-400"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-slate-200 text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {matchedEmployees.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1">Employés</p>
                {matchedEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelectView('employees')}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar name={`${emp.nom} ${emp.prenom}`} photoUrl={emp.photoUrl || ''} size={32} />
                      <div>
                        <p className="font-bold text-slate-900">{emp.nom} {emp.prenom} ({emp.matricule})</p>
                        <p className="text-[10px] text-slate-500">{emp.poste} · {emp.departement}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {matchedDepartments.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 px-2 mb-1">Départements</p>
                {matchedDepartments.map(dep => (
                  <button
                    key={dep.id}
                    onClick={() => handleSelectView('attendance')}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                      <div>
                        <p className="font-bold text-slate-900">{dep.name}</p>
                        <p className="text-[10px] text-slate-500">Code : {dep.code} · Responsable : {dep.manager}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {matchedEmployees.length === 0 && matchedDepartments.length === 0 && (
              <p className="py-4 text-center text-slate-400">Aucun résultat trouvé pour "{query}".</p>
            )}
          </div>
        )}

        {/* Quick links when empty */}
        {!query.trim() && (
          <div className="pt-2 text-slate-500 space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 px-2">Navigation rapide</p>
            <button
              onClick={() => handleSelectView('attendance')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-left"
            >
              <Calendar className="w-3.5 h-3.5 text-brand" />
              <span>Consulter les présences d'aujourd'hui</span>
            </button>
            <button
              onClick={() => handleSelectView('reports')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-left"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>Générer la liste quotidienne des retards</span>
            </button>
            <button
              onClick={() => handleSelectView('settings')}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-left"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Vérifier la connexion de la pointeuse ZKTeco</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
