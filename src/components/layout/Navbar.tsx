import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sun, Moon, Globe, Shield, User, Clock, 
  Search, RefreshCw, CheckCircle2, AlertTriangle, Fingerprint, LogOut
} from 'lucide-react';

interface NavbarProps {
  onOpenQuickPunch: () => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenQuickPunch, onOpenSearch }) => {
  const { 
    theme, toggleTheme, language, setLanguage, 
    currentUser, switchUserRole, allUsers, zktecoConfig,
    companySettings, setCurrentUser, currentView
  } = useApp();

  const [currentTime, setCurrentTime] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Goma / CAT timezone (GMT+2)
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'SECRETAIRE': return 'Secrétaire';
      case 'RH': return 'Responsable RH';
      case 'DIRECTEUR': return 'Directeur';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
      case 'DIRECTEUR': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'RH': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    }
  };

  return (
    <header className="h-16 px-6 glass-panel border-b border-[#E1E3E9] dark:border-gray-800 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
            <img 
              src={`${import.meta.env.BASE_URL}premidis-symbol.png`} 
              alt="Logo PREMIDIS S.A.R.L." 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[#1D2030] dark:text-white">
                PREMIDIS <span className="text-[#7C4DFF] font-semibold">Attendance</span>
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Goma, RDC
              </span>
            </div>
            <p className="text-[11px] text-[#717787] dark:text-gray-400 -mt-0.5 hidden sm:block">
              Route Aéroport N°20 · Bujovu
            </p>
          </div>
        </div>

        {/* Device Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <Fingerprint className="w-3.5 h-3.5 text-[#7C4DFF]" />
            <span className="font-medium text-[11px]">{zktecoConfig.model.split(' ')[1] || 'ZKTeco'}</span>
            <span className={`w-2 h-2 rounded-full ${
              zktecoConfig.status === 'ONLINE' ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900' :
              zktecoConfig.status === 'SYNCHRONIZING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
              {zktecoConfig.status.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-[#717787] bg-gray-100/80 hover:bg-gray-100 dark:bg-gray-800/80 dark:hover:bg-gray-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-700 rounded-xl transition-all"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span>Rechercher un employé, matricule, département...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-gray-500 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/60 text-xs font-mono font-medium text-gray-700 dark:text-gray-300 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#7C4DFF]" />
          <span>{currentTime}</span>
        </div>

        {/* Quick Punch Button (Gatekeeper/Secrétariat) */}
        <button
          onClick={onOpenQuickPunch}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7C4DFF] to-[#6a38f3] text-white text-xs font-semibold shadow-sm hover:shadow hover:brightness-105 active:scale-98 transition-all"
          title="Pointer une arrivée ou une sortie"
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pointer</span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold transition-colors"
          title="Changer de langue (FR / EN)"
        >
          <span className="uppercase text-[11px]">{language}</span>
        </button>

        {/* Dark / Light Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {/* User Switcher & Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-800 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-bold text-[#1D2030] dark:text-white leading-tight">
                {currentUser?.name}
              </p>
              <p className="text-[10px] text-[#717787] dark:text-gray-400 font-medium">
                {getRoleLabel(currentUser?.role || '')}
              </p>
            </div>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 glass-card rounded-2xl p-2 shadow-xl border border-gray-200 dark:border-gray-800 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                <p className="text-xs font-bold text-gray-900 dark:text-white">{currentUser?.name}</p>
                <p className="text-[11px] text-gray-500">{currentUser?.email}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${getRoleBadgeColor(currentUser?.role || '')}`}>
                  {getRoleLabel(currentUser?.role || '')}
                </span>
              </div>

              <div className="py-1">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                  Changer de profil (Simulation des rôles)
                </p>
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUserRole(u.role);
                      setShowUserMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      currentUser?.role === u.role
                        ? 'bg-[#7C4DFF]/10 text-[#7C4DFF] font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200">
                        {u.avatar && <img src={u.avatar} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span>{u.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{u.role}</span>
                  </button>
                ))}
              </div>

              <div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
