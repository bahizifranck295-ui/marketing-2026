import React, { useState } from 'react';
import { useApp, AppView } from '../../context/AppContext';
import {
  Home, Users, CalendarCheck, FileText,
  AlertOctagon, Settings, Cpu, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { LOGO_ALT, LOGO_SRC } from '../../app/brand';

// Menu latéral au format PREMIDIS ERP : en-tête logo, liens, carte utilisateur, réduction du menu.
export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, employees, attendanceRecords, sanctionCases, zktecoConfig, can, currentUser, workingDate } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  // Compute live badges
  // Badge du jour affiché par défaut : le dernier jour importé depuis la pointeuse
  const todayRecords = attendanceRecords.filter(r => r.date === workingDate);
  const todayLates = todayRecords.filter(r => r.status === 'RETARD').length;
  const pendingSanctions = sanctionCases.filter(s => s.status === 'EN_EXAMEN' || s.status === 'PROPOSEE').length;

  const navItems: { id: AppView; label: string; short: string; icon: any; badge?: number | string; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Tableau de bord', short: 'Accueil', icon: Home },
    { id: 'employees', label: 'Employés', short: 'Employés', icon: Users, badge: employees.length },
    {
      id: 'attendance', label: 'Présences', short: 'Présences', icon: CalendarCheck,
      badge: todayLates > 0 ? `${todayLates} ret.` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    { id: 'reports', label: 'Rapports & Documents', short: 'Rapports', icon: FileText },
    {
      id: 'sanctions', label: 'Retards & Sanctions', short: 'Sanctions', icon: AlertOctagon,
      badge: pendingSanctions > 0 ? pendingSanctions : undefined,
      badgeColor: 'bg-red-100 text-red-700',
    },
    { id: 'settings', label: 'Paramètres', short: 'Paramètres', icon: Settings },
  ];
  const allowed = navItems.filter(item => can(item.id));

  const initials = (currentUser?.name || 'PA').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-sidebar text-sidebar-fg border-r border-sidebar-line transition-all duration-300 sticky top-0 h-screen z-40 ${
          collapsed ? 'w-20' : 'w-[245px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-sidebar-line select-none">
          <div className="h-9 w-14 rounded-xl logo-tile border border-line flex items-center justify-center p-0.5 flex-shrink-0 shadow-xs">
            <img src={LOGO_SRC} alt={LOGO_ALT} className="max-h-full max-w-full object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-black tracking-wider text-ink truncate">PREMIDIS SARL</span>
              <span className="text-[10px] text-sidebar-muted truncate">Gestion des présences</span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {allowed.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand text-white font-semibold shadow-[var(--shadow-glow)]'
                    : 'nav-item text-sidebar-fg hover:bg-sidebar-hover hover:text-brand'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Pointeuse ZKTeco */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="p-3 rounded-xl border border-sidebar-line bg-slate-50 text-[11px]">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold text-ink">
                  <Cpu className="w-3.5 h-3.5 text-brand" /> Biométrie ZKTeco
                </span>
                <span className="text-[10px] font-semibold text-slate-500">Clé USB</span>
              </div>
              <p className="text-sidebar-muted leading-snug">
                {zktecoConfig.model.replace(/\(.*?\)/, '').trim()} · dernier import : {zktecoConfig.lastPunchImportedTime ? zktecoConfig.lastPunchImportedTime.slice(0, 16) : 'aucun'}
              </p>
              {can('settings') && (
                <button onClick={() => setCurrentView('settings')} className="mt-1.5 font-semibold text-brand hover:underline">
                  Importer le fichier du jour →
                </button>
              )}
            </div>
          </div>
        )}

        {/* User Card & Collapse */}
        <div className="p-3 border-t border-sidebar-line space-y-2">
          <div className={`flex items-center gap-2.5 p-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
            <div className="h-8 w-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-ink truncate">{currentUser?.name || 'Utilisateur'}</span>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>En ligne</span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-[11px] text-sidebar-muted hover:text-brand hover:bg-sidebar-hover rounded-lg transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Réduire le menu</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV (< lg) : modules non autorisés absents */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 grid z-40 shadow-lg"
        style={{ gridTemplateColumns: `repeat(${allowed.length}, minmax(0, 1fr))` }}
      >
        {allowed.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center py-2.5 gap-0.5 text-[11px] transition-colors ${
                isActive ? 'text-brand font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{item.short}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
