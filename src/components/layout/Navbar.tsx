import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, Search, LogOut, Languages } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import { LOGO_ALT, LOGO_SRC } from '../../app/brand';

interface NavbarProps {
  onOpenQuickPunch: () => void;
  onOpenSearch: () => void;
}

// Barre d'outils au langage visuel PREMIDIS ERP (boutons « hdr-btn », pastilles d'état)
export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const { language, setLanguage, currentUser, setCurrentUser, addAuditLog } = useApp();

  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);


  return (
    <header className="px-4 lg:px-6 pt-4 w-full max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center gap-2">
        {/* Logo (mobile : le menu latéral est masqué) */}
        <div className="lg:hidden h-9 w-14 rounded-xl logo-tile border border-line flex items-center justify-center p-0.5 shadow-xs">
          <img src={LOGO_SRC} alt={LOGO_ALT} className="max-h-full max-w-full object-contain" />
        </div>

        {/* Recherche globale */}
        <button
          onClick={onOpenSearch}
          className="hdr-btn flex-1 min-w-[200px] max-w-md h-9 flex items-center justify-between gap-2 px-3 rounded-xl text-xs"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate text-slate-500">Rechercher un employé, matricule, département…</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-slate-200 text-slate-500">Ctrl+K</kbd>
        </button>


        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Horloge en direct (agrandie, visible sur tous les modules) */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <Clock className="h-5 w-5 text-brand" />
            <div className="leading-none">
              <span className="block font-mono text-xl font-bold tabular-nums tracking-wide text-slate-900">{currentTime}</span>
              <span className="mt-0.5 block whitespace-nowrap text-[10px] font-semibold capitalize text-slate-500">{currentDate}</span>
            </div>
          </div>

          {/* Langue */}
          <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="hdr-btn inline-flex h-9 min-w-9 px-2 items-center justify-center gap-1 rounded-full text-[11px] font-bold uppercase"
            title="Changer de langue (FR / EN)"
            aria-label="Changer de langue"
          >
            <Languages className="h-4 w-4" />
            {language}
          </button>

          <ThemeToggle />

          {/* Utilisateur connecté + déconnexion */}
          <span className="ml-1 hidden sm:block max-w-[180px] truncate text-[13px] font-bold text-slate-900">
            {currentUser?.name}
          </span>
          <button
            onClick={() => {
              addAuditLog('DECONNEXION', currentUser?.name || '', 'Fin de session');
              setCurrentUser(null);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
};
