import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { EmployeesView } from './components/employees/EmployeesView';
import { AttendanceView } from './components/attendance/AttendanceView';
import { ReportsView } from './components/reports/ReportsView';
import { SanctionsView } from './components/sanctions/SanctionsView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { QuickPunchModal } from './components/modals/QuickPunchModal';
import { CorrectAttendanceModal } from './components/modals/CorrectAttendanceModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { AttendanceRecord } from './types';

function MainApp() {
  const { currentUser, currentView, setCurrentView, can } = useApp();

  const [isQuickPunchOpen, setIsQuickPunchOpen] = useState(false);
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Si le module affiché n'est pas autorisé pour ce rôle, on bascule sur le premier module permis
  const allowedViews = (['dashboard', 'employees', 'attendance', 'reports', 'sanctions', 'settings'] as const).filter(v => can(v));
  useEffect(() => {
    if (currentUser && !can(currentView) && allowedViews.length > 0) {
      setCurrentView(allowedViews[0]);
    }
  });

  // If not logged in, show authentic Login page
  if (!currentUser) {
    return <LoginView />;
  }

  if (allowedViews.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="glass-card rounded-2xl p-8 max-w-md space-y-2">
          <h1 className="text-2xl">Aucun module autorisé</h1>
          <p className="text-sm text-muted">Le rôle de votre compte ne donne accès à aucun module. Demandez à l'administrateur de vous attribuer des permissions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-ink dark:text-ink-inv flex flex-col transition-colors selection:bg-brand selection:text-white">
      {/* Top Navbar */}
      <Navbar 
        onOpenQuickPunch={() => setIsQuickPunchOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Content Viewport */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-[calc(100vw-16rem)]">
          {currentView === 'dashboard' && (
            <DashboardView 
              onOpenQuickPunch={() => setIsQuickPunchOpen(true)}
              onOpenCorrectModal={(rec) => setCorrectingRecord(rec)}
            />
          )}

          {currentView === 'employees' && (
            <EmployeesView />
          )}

          {currentView === 'attendance' && (
            <AttendanceView 
              onOpenQuickPunch={() => setIsQuickPunchOpen(true)}
              onOpenCorrectModal={(rec) => setCorrectingRecord(rec)}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView />
          )}

          {currentView === 'sanctions' && (
            <SanctionsView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <QuickPunchModal 
        isOpen={isQuickPunchOpen}
        onClose={() => setIsQuickPunchOpen(false)}
      />

      {correctingRecord && (
        <CorrectAttendanceModal 
          record={correctingRecord}
          onClose={() => setCorrectingRecord(null)}
        />
      )}

      <GlobalSearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
