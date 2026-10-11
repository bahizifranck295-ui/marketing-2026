import React from 'react';
import { useApp, AppView } from '../../context/AppContext';
import { 
  LayoutDashboard, Users, CalendarCheck, FileText, 
  AlertOctagon, Settings, ShieldAlert, Cpu, Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, employees, attendanceRecords, sanctionCases, zktecoConfig } = useApp();

  // Compute live badges
  const todayStr = '2026-10-11';
  const todayRecords = attendanceRecords.filter(r => r.date === todayStr);
  const todayLates = todayRecords.filter(r => r.status === 'RETARD').length;
  const pendingSanctions = sanctionCases.filter(s => s.status === 'EN_EXAMEN' || s.status === 'PROPOSEE').length;

  const navItems: { id: AppView; label: string; icon: any; badge?: number | string; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard
    },
    {
      id: 'employees',
      label: 'Employés',
      icon: Users,
      badge: employees.length
    },
    {
      id: 'attendance',
      label: 'Présences',
      icon: CalendarCheck,
      badge: todayLates > 0 ? `${todayLates} ret.` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    },
    {
      id: 'reports',
      label: 'Rapports & Documents',
      icon: FileText
    },
    {
      id: 'sanctions',
      label: 'Retards & Sanctions',
      icon: AlertOctagon,
      badge: pendingSanctions > 0 ? pendingSanctions : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings
    }
  ];

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] sticky top-16 glass-panel border-r border-line dark:border-gray-800 flex flex-col justify-between p-4 shrink-0 transition-colors">
      {/* Top Nav List */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-muted dark:text-gray-400">
          Menu Principal
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`nav-item ${isActive ? 'nav-item-active' : ''} w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-brand/25 via-neon-blue/10 to-transparent text-ink dark:text-white ring-1 ring-brand/30 font-bold'
                  : 'text-ink dark:text-gray-300 hover:bg-gray-100/90 dark:hover:bg-gray-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-neon drop-shadow-[0_0_6px_var(--color-neon)]' : 'text-brand dark:text-neon'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-neon/15 text-neon ring-1 ring-neon/40'
                      : item.badgeColor || 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Card: ZKTeco Device Status & Quick Link */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800/80">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/40 dark:from-gray-800/40 dark:to-purple-950/20 border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
              <Cpu className="w-3.5 h-3.5 text-brand" />
              <span>Biométrie ZKTeco</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En ligne
            </span>
          </div>

          <p className="text-[11px] text-muted dark:text-gray-400 leading-snug mb-2.5">
            {zktecoConfig.model.replace(/\(.*?\)/, '').trim()} ({zktecoConfig.ipAddress})
          </p>

          <button
            onClick={() => setCurrentView('settings')}
            className="w-full py-1.5 px-2.5 rounded-lg bg-white dark:bg-gray-900 text-[11px] font-semibold text-brand dark:text-neon hover:shadow-xs transition-all border border-purple-100 dark:border-gray-700 text-center"
          >
            Gérer la pointeuse →
          </button>
        </div>

        {/* Corporate Legal Note */}
        <div className="mt-3 px-2 text-[10px] text-gray-400 text-center font-mono">
          PREMIDIS SARL · RCCM 14-B-0203
        </div>
      </div>
    </aside>
  );
};
