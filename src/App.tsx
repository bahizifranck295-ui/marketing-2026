import React, { useState } from 'react';
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
  const { currentUser, currentView } = useApp();

  const [isQuickPunchOpen, setIsQuickPunchOpen] = useState(false);
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // If not logged in, show authentic Login page
  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#F2F1FA] dark:bg-[#0B0F19] text-[#1D2030] dark:text-[#E2E8F0] flex flex-col transition-colors selection:bg-[#7C4DFF] selection:text-white">
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
