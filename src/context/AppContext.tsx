import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Employee, Department, AttendanceRecord, AttendanceStatus, 
  ZKTecoDeviceConfig, SanctionRule, SanctionCase, AuditLog, CompanySettings,
  SyncLogEntry, SanctionStatus, AppModule, PermissionAction, RoleDefinition
} from '../types';
import { normalizeSanctionLevel } from '../types';
import { INITIAL_ROLES } from '../data/permissions';
import type { DayAttendance } from '../utils/attendanceReader';
import { useTheme, setThemeUser } from '../theme/theme';
import { 
  INITIAL_COMPANY_SETTINGS, INITIAL_USERS, INITIAL_DEPARTMENTS, 
  INITIAL_EMPLOYEES, generateMockAttendance, INITIAL_SANCTION_RULES, 
  INITIAL_SANCTION_CASES, INITIAL_ZKTECO_CONFIG, INITIAL_AUDIT_LOGS 
} from '../data/mockData';

export type AppView = AppModule;

interface AppContextType {
  // Appearance & Session
  theme: 'light' | 'dark';
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  /** Carnet de présence d'un agent ouvert depuis le tableau de bord (matricule), sinon null */
  carnetEmployee: string | null;
  openEmployeeCarnet: (matricule: string | null) => void;
  /** Onglet ouvert à l'arrivée dans Rapports (le menu ouvre le relevé des présences) */
  reportTab: 'ATTENDANCE' | 'SANCTIONS';
  openReport: (tab: 'ATTENDANCE' | 'SANCTIONS', month?: string) => void;
  /** Mois proposé à l'arrivée dans Rapports (AAAA-MM) */
  reportMonth: string | null;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  allUsers: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Rôles & permissions
  roles: RoleDefinition[];
  addRole: (role: Omit<RoleDefinition, 'id' | 'system'>) => void;
  updateRole: (id: string, role: Partial<Omit<RoleDefinition, 'id' | 'system'>>) => void;
  deleteRole: (id: string) => void;
  getRoleLabel: (roleId: string) => string;
  can: (module: AppModule, action?: PermissionAction) => boolean;
  
  // Data entities
  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;
  departments: Department[];
  addDepartment: (dep: Omit<Department, 'id'>) => void;
  
  employees: Employee[];
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  attendanceRecords: AttendanceRecord[];
  correctAttendance: (recordId: string, newCheckIn: string | null, newCheckOut: string | null, reason: string) => void;
  
  // ZKTeco integration
  zktecoConfig: ZKTecoDeviceConfig;
  updateZKTecoConfig: (config: Partial<ZKTecoDeviceConfig>) => void;
  /** Importe des journées déjà lues et vérifiées (aperçu de l'import) */
  applyAttendanceImport: (fileName: string, days: DayAttendance[], warnings?: string[]) => { count: number; absents: number; dates: string[] };
  /** Jour affiché par défaut : le dernier jour importé depuis la pointeuse */
  workingDate: string;

  // Sanctions
  sanctionRules: SanctionRule[];
  addSanctionRule: (rule: Omit<SanctionRule, 'id'>) => void;
  updateSanctionRule: (id: string, rule: Partial<SanctionRule>) => void;
  deleteSanctionRule: (id: string) => void;
  sanctionCases: SanctionCase[];
  reviewSanctionCase: (id: string, status: SanctionStatus, motif: string, approvedAmount?: number) => void;
  
  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (action: string, target: string, details: string) => void;

  // Calculation helpers
  calculateStatus: (expectedIn: string, actualIn: string | null, toleranceMin: number) => { status: AttendanceStatus; lateMinutes: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Theme State
  // Thème clair / sombre : même moteur que PREMIDIS ERP (attribut data-theme, préférence par utilisateur)
  const { theme } = useTheme();

  // 3. User & Navigation
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('premidis_users');
      if (saved) return JSON.parse(saved);
    } catch { /* données locales illisibles : on repart des comptes de base */ }
    return INITIAL_USERS.map(u => ({ ...u, active: true }));
  });
  const [roles, setRoles] = useState<RoleDefinition[]>(() => {
    try {
      const saved = localStorage.getItem('premidis_roles');
      if (saved) return JSON.parse(saved);
    } catch { /* idem */ }
    return INITIAL_ROLES;
  });
  // Aucune session gardée : à chaque ouverture, l'introduction puis la page de connexion
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [carnetEmployee, setCarnetEmployee] = useState<string | null>(null);
  const openEmployeeCarnet = (matricule: string | null) => {
    setCarnetEmployee(matricule);
    if (matricule) setCurrentView('attendance');
  };
  const [reportTab, setReportTab] = useState<'ATTENDANCE' | 'SANCTIONS'>('ATTENDANCE');
  const [reportMonth, setReportMonth] = useState<string | null>(null);
  const openReport = (tab: 'ATTENDANCE' | 'SANCTIONS', month?: string) => {
    setCarnetEmployee(null);
    setReportTab(tab);
    setReportMonth(month ?? null);
    setCurrentView('reports');
  };
  // Changer d'écran depuis le menu referme le carnet individuel et rouvre les rapports sur les présences
  const goToView = (view: AppView) => { setCarnetEmployee(null); setReportTab('ATTENDANCE'); setReportMonth(null); setCurrentView(view); };

  useEffect(() => {
    try { localStorage.setItem('premidis_users', JSON.stringify(allUsers)); } catch { /* stockage indisponible */ }
  }, [allUsers]);
  useEffect(() => {
    try { localStorage.setItem('premidis_roles', JSON.stringify(roles)); } catch { /* stockage indisponible */ }
  }, [roles]);

  useEffect(() => {
    setThemeUser(currentUser?.id || null);
  }, [currentUser?.id]);

  const getRoleLabel = (roleId: string) => roles.find(r => r.id === roleId)?.label || roleId;

  const can = (module: AppModule, action: PermissionAction = 'view') => {
    if (!currentUser) return false;
    const role = roles.find(r => r.id === currentUser.role);
    return !!role?.permissions[module]?.includes(action);
  };

  const addUser = (user: Omit<User, 'id'>) => {
    const newUser: User = { ...user, id: `usr-${Date.now()}`, active: user.active ?? true };
    setAllUsers(prev => [...prev, newUser]);
    addAuditLog('CREATION_UTILISATEUR', newUser.email, `Rôle : ${getRoleLabel(newUser.role)}`);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setAllUsers(prev => prev.map(u => (u.id === id ? { ...u, ...data } : u)));
    if (currentUser?.id === id) setCurrentUser(prev => (prev ? { ...prev, ...data } : prev));
    const target = allUsers.find(u => u.id === id);
    const details = data.role ? `Nouveau rôle : ${getRoleLabel(data.role)}`
      : data.active !== undefined ? (data.active ? 'Compte activé' : 'Compte désactivé')
      : 'Mise à jour du compte';
    addAuditLog('MODIFICATION_UTILISATEUR', target?.email || id, details);
  };

  const deleteUser = (id: string) => {
    if (currentUser?.id === id) return; // on ne supprime pas son propre compte
    const target = allUsers.find(u => u.id === id);
    setAllUsers(prev => prev.filter(u => u.id !== id));
    addAuditLog('SUPPRESSION_UTILISATEUR', target?.email || id, 'Compte supprimé');
  };

  const addRole = (role: Omit<RoleDefinition, 'id' | 'system'>) => {
    const base = role.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'ROLE';
    let id = base;
    for (let i = 2; roles.some(r => r.id === id); i++) id = `${base}_${i}`;
    setRoles(prev => [...prev, { ...role, id }]);
    addAuditLog('CREATION_ROLE', role.label, role.description || 'Nouveau rôle');
  };

  const updateRole = (id: string, data: Partial<Omit<RoleDefinition, 'id' | 'system'>>) => {
    if (id === 'ADMIN' && data.permissions) return; // l'administrateur garde tous les droits
    setRoles(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
    addAuditLog('MODIFICATION_ROLE', getRoleLabel(id), data.permissions ? 'Permissions mises à jour' : 'Rôle mis à jour');
  };

  const deleteRole = (id: string) => {
    const role = roles.find(r => r.id === id);
    if (!role || role.system || allUsers.some(u => u.role === id)) return;
    setRoles(prev => prev.filter(r => r.id !== id));
    addAuditLog('SUPPRESSION_ROLE', role.label, 'Rôle supprimé');
  };

  // 4. Data states with localStorage persistence
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('premidis_settings');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_SETTINGS;
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    const saved = localStorage.getItem('premidis_departments');
    return saved ? JSON.parse(saved) : INITIAL_DEPARTMENTS;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('premidis_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [workingDate, setWorkingDate] = useState<string>(() => {
    try { return localStorage.getItem('premidis_working_date') || '2026-10-11'; } catch { return '2026-10-11'; }
  });
  useEffect(() => { try { localStorage.setItem('premidis_working_date', workingDate); } catch { /* stockage indisponible */ } }, [workingDate]);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('premidis_attendance');
    if (!saved) return generateMockAttendance();
    // Anciennes données de démonstration : « 08:-4 » corrigé en « 07:56 »
    const fix = (t: string | null) => {
      const m = t?.match(/^(\d{2}):(-\d+)$/);
      if (!m) return t;
      const total = Number(m[1]) * 60 + Number(m[2]);
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };
    return (JSON.parse(saved) as AttendanceRecord[]).map(r => ({ ...r, actualCheckIn: fix(r.actualCheckIn), actualCheckOut: fix(r.actualCheckOut) }));
  });

  const [zktecoConfig, setZKTecoConfig] = useState<ZKTecoDeviceConfig>(() => {
    const saved = localStorage.getItem('premidis_zkteco');
    return saved ? JSON.parse(saved) : INITIAL_ZKTECO_CONFIG;
  });

  const [sanctionRules, setSanctionRules] = useState<SanctionRule[]>(() => {
    const saved = localStorage.getItem('premidis_sanction_rules');
    if (!saved) return INITIAL_SANCTION_RULES;
    return (JSON.parse(saved) as SanctionRule[]).map(r => ({ ...r, sanctionType: normalizeSanctionLevel(r.sanctionType, r.deductionAmount) }));
  });

  const [sanctionCases, setSanctionCases] = useState<SanctionCase[]>(() => {
    const saved = localStorage.getItem('premidis_sanction_cases');
    if (!saved) return INITIAL_SANCTION_CASES;
    return (JSON.parse(saved) as SanctionCase[]).map(c => ({ ...c, proposedSanction: normalizeSanctionLevel(c.proposedSanction, c.deductionAmount) }));
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('premidis_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Save to localStorage when updated
  useEffect(() => {
    localStorage.setItem('premidis_settings', JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem('premidis_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('premidis_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('premidis_attendance', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('premidis_zkteco', JSON.stringify(zktecoConfig));
  }, [zktecoConfig]);

  useEffect(() => {
    localStorage.setItem('premidis_sanction_rules', JSON.stringify(sanctionRules));
  }, [sanctionRules]);

  useEffect(() => {
    localStorage.setItem('premidis_sanction_cases', JSON.stringify(sanctionCases));
  }, [sanctionCases]);

  useEffect(() => {
    localStorage.setItem('premidis_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Audit Log Helper
  const addAuditLog = (action: string, target: string, details: string) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Système',
      userRole: currentUser?.role || 'ADMIN',
      action,
      target,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Status Calculation Helper (STRICT 3-STATUS RULE)
  const calculateStatus = (expectedIn: string, actualIn: string | null, toleranceMin: number): { status: AttendanceStatus; lateMinutes: number } => {
    if (!actualIn) {
      return { status: 'ABSENT', lateMinutes: 0 };
    }

    const [expH, expM] = expectedIn.split(':').map(Number);
    const [actH, actM] = actualIn.split(':').map(Number);

    const expectedTotal = expH * 60 + expM;
    const actualTotal = actH * 60 + actM;
    const diff = actualTotal - expectedTotal;

    if (diff <= toleranceMin) {
      return { status: 'PRESENT', lateMinutes: 0 };
    } else {
      return { status: 'RETARD', lateMinutes: diff };
    }
  };

  // Employee Actions
  const addEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`
    };
    setEmployees(prev => [...prev, newEmp]);
    addAuditLog('CREATION_EMPLOYE', `${newEmp.matricule} - ${newEmp.nom} ${newEmp.prenom}`, `Département: ${newEmp.departement}`);
  };

  const updateEmployee = (id: string, empData: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...empData } : e));
    const emp = employees.find(e => e.id === id);
    addAuditLog('MODIFICATION_EMPLOYE', emp ? emp.matricule : id, 'Mise à jour du dossier employé');
  };

  const deleteEmployee = (id: string) => {
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setEmployees(prev => prev.filter(e => e.id !== id));
      addAuditLog('SUPPRESSION_EMPLOYE', emp.matricule, `Suppression de l'employé ${emp.nom} ${emp.prenom}`);
    }
  };

  // Department Actions
  const addDepartment = (depData: Omit<Department, 'id'>) => {
    const newDep: Department = {
      ...depData,
      id: `dep-${Date.now()}`
    };
    setDepartments(prev => [...prev, newDep]);
    addAuditLog('CREATION_DEPARTEMENT', newDep.name, `Code: ${newDep.code}`);
  };



  // Attendance Actions
  const correctAttendance = (recordId: string, newCheckIn: string | null, newCheckOut: string | null, reason: string) => {
    const existing = attendanceRecords.find(r => r.id === recordId);
    if (!existing) return;

    const emp = employees.find(e => e.matricule === existing.employeeId);
    const tolerance = emp ? emp.toleranceMinutes : companySettings.defaultToleranceMinutes;
    const { status, lateMinutes } = calculateStatus(existing.expectedCheckIn, newCheckIn, tolerance);

    let earlyDeparture = 0;
    if (newCheckOut && existing.expectedCheckOut) {
      const [expH, expM] = existing.expectedCheckOut.split(':').map(Number);
      const [actH, actM] = newCheckOut.split(':').map(Number);
      const diff = (expH * 60 + expM) - (actH * 60 + actM);
      if (diff > 0) earlyDeparture = diff;
    }

    const updated: AttendanceRecord = {
      ...existing,
      actualCheckIn: newCheckIn,
      actualCheckOut: newCheckOut,
      status, // Strictly PRESENT | RETARD | ABSENT
      lateMinutes,
      earlyDepartureMinutes: earlyDeparture,
      isCorrected: true,
      correctedBy: currentUser?.name || 'Administrateur',
      correctionReason: reason,
      correctionDate: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    setAttendanceRecords(prev => prev.map(r => r.id === recordId ? updated : r));
    addAuditLog('CORRECTION_POINTAGE', `${existing.employeeId} - ${existing.date}`, `Motif: ${reason} (Statut: ${status}, Entrée: ${newCheckIn || 'N/A'})`);
  };

  const bulkImportAttendance = (newRecords: AttendanceRecord[], sourceMessage: string) => {
    // Compte fait sur les données actuelles (et non dans la mise à jour différée de React)
    const existing = new Set(attendanceRecords.map(r => `${r.employeeId}-${r.date}`));
    const added = newRecords.filter(r => !existing.has(`${r.employeeId}-${r.date}`)).length;
    const updated = newRecords.length - added;

    setAttendanceRecords(prev => {
      const map = new Map<string, AttendanceRecord>(prev.map(r => [`${r.employeeId}-${r.date}`, r]));
      newRecords.forEach(nr => {
        const key = `${nr.employeeId}-${nr.date}`;
        if (map.has(key)) {
          const cur = map.get(key)!;
          if (cur.isCorrected) {
            // Une correction manuelle validée reste prioritaire sur le fichier de la pointeuse
            map.set(key, { ...cur, notes: `${cur.notes || ''} · Pointeuse : ${nr.rawPunchInTime || ''}`.replace(/^ · /, '') });
          } else {
            map.set(key, {
              ...cur,
              actualCheckIn: nr.actualCheckIn || cur.actualCheckIn,
              actualCheckOut: nr.actualCheckOut || cur.actualCheckOut,
              earlyDepartureMinutes: nr.earlyDepartureMinutes,
              status: nr.status,
              lateMinutes: nr.lateMinutes,
              source: nr.source,
              notes: nr.notes,
              rawPunchInTime: nr.rawPunchInTime || cur.rawPunchInTime,
              rawPunchOutTime: nr.rawPunchOutTime || cur.rawPunchOutTime
            });
          }
        } else {
          map.set(key, nr);
        }
      });
      return Array.from(map.values());
    });

    addAuditLog('IMPORT_POINTAGES', `${newRecords.length} lignes`, sourceMessage);
    return { added, updated };
  };

  // ZKTeco Device Actions
  const updateCompanySettings = (newSettings: Partial<CompanySettings>) => {
    setCompanySettings(prev => ({ ...prev, ...newSettings }));
    addAuditLog('PARAMETRES_ENTREPRISE', 'Configuration', 'Mise à jour des paramètres généraux');
  };

  const updateZKTecoConfig = (config: Partial<ZKTecoDeviceConfig>) => {
    setZKTecoConfig(prev => ({ ...prev, ...config }));
    addAuditLog('PARAMETRES_ZKTECO', 'Appareil de pointage', 'Mise à jour de la configuration ZKTeco');
  };

  const applyAttendanceImport = (fileName: string, days: DayAttendance[], warnings: string[] = []) => {
    // Une journée par agent : premier pointage = entrée, dernier = sortie. Les agents actifs sans aucun
    // pointage ces jours-là sont marqués absents (sauf s'ils ont déjà une ligne dans le carnet).
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const records: AttendanceRecord[] = days.map(({ emp, date, checkIn, checkOut, punches }) => {
      const { status, lateMinutes } = calculateStatus(emp.heureEntreeNormale, checkIn, emp.toleranceMinutes);
      return {
        id: `att-${emp.matricule}-${date}`,
        employeeId: emp.matricule,
        employeeName: `${emp.nom} ${emp.postnom} ${emp.prenom}`,
        department: emp.departement,
        date,
        expectedCheckIn: emp.heureEntreeNormale,
        actualCheckIn: checkIn,
        lateMinutes,
        expectedCheckOut: emp.heureSortieNormale,
        actualCheckOut: checkOut,
        earlyDepartureMinutes: checkOut ? Math.max(0, toMin(emp.heureSortieNormale) - toMin(checkOut)) : 0,
        status,
        source: 'FILE_IMPORT',
        rawPunchInTime: `${date} ${punches.join(' / ')}`,
        notes: `Importé depuis ${fileName} (${punches.length} pointage(s))`
      };
    });
    const dates = [...new Set(days.map(d => d.date))];
    const seen = new Set([...attendanceRecords.map(r => `${r.employeeId}|${r.date}`), ...records.map(r => `${r.employeeId}|${r.date}`)]);
    const absents: AttendanceRecord[] = [];
    dates.forEach(date => employees.filter(e => e.statutAdministratif === 'ACTIF' && !seen.has(`${e.matricule}|${date}`)).forEach(emp => absents.push({
      id: `att-${emp.matricule}-${date}`,
      employeeId: emp.matricule,
      employeeName: `${emp.nom} ${emp.postnom} ${emp.prenom}`,
      department: emp.departement,
      date,
      expectedCheckIn: emp.heureEntreeNormale,
      actualCheckIn: null,
      lateMinutes: 0,
      expectedCheckOut: emp.heureSortieNormale,
      actualCheckOut: null,
      earlyDepartureMinutes: 0,
      status: 'ABSENT',
      source: 'FILE_IMPORT',
      notes: `Aucun pointage dans ${fileName}`
    })));
    if (!records.length) return { count: 0, absents: 0, dates };

    bulkImportAttendance([...records, ...absents], `Fichier de la pointeuse importé : ${fileName}`);
    // Le tableau de bord, le carnet et les rapports s'ouvrent ensuite sur le dernier jour importé
    setWorkingDate(dates.sort()[dates.length - 1]);
    const newLog: SyncLogEntry = {
      id: `file-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: 'USB_FILE_IMPORT',
      punchesImported: records.length,
      newPunches: records.length,
      duplicatesSkipped: 0,
      status: warnings.length > 0 ? 'WARNING' : 'SUCCESS',
      message: `Import de « ${fileName} » : ${records.length} présence(s), ${absents.length} absence(s), ${warnings.length} avertissement(s).`,
      operatorName: currentUser?.name
    };
    setZKTecoConfig(prev => ({
      ...prev,
      lastPunchImportedTime: newLog.timestamp,
      importedPunchesCount: prev.importedPunchesCount + records.length,
      syncLogs: [newLog, ...prev.syncLogs]
    }));
    return { count: records.length, absents: absents.length, dates };
  };

  // Sanctions Actions
  const addSanctionRule = (ruleData: Omit<SanctionRule, 'id'>) => {
    const newRule: SanctionRule = {
      ...ruleData,
      id: `rule-${Date.now()}`
    };
    setSanctionRules(prev => [...prev, newRule]);
    addAuditLog('CREATION_REGLE_SANCTION', newRule.name, `Seuil: ${newRule.thresholdLateCount} retards`);
  };

  const updateSanctionRule = (id: string, ruleData: Partial<SanctionRule>) => {
    setSanctionRules(prev => prev.map(r => r.id === id ? { ...r, ...ruleData } : r));
    addAuditLog('MODIFICATION_REGLE_SANCTION', id, 'Mise à jour des critères de sanction');
  };

  const deleteSanctionRule = (id: string) => {
    setSanctionRules(prev => prev.filter(r => r.id !== id));
    addAuditLog('SUPPRESSION_REGLE_SANCTION', id, 'Suppression d\'un barème de sanction');
  };

  const reviewSanctionCase = (id: string, newStatus: SanctionStatus, motif: string, approvedAmount?: number) => {
    const sc = sanctionCases.find(c => c.id === id);
    if (!sc) return;

    const finalAmount = approvedAmount !== undefined ? approvedAmount : sc.deductionAmount;

    const updated: SanctionCase = {
      ...sc,
      status: newStatus,
      decisionDate: new Date().toISOString().substring(0, 10),
      decidedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Direction',
      decisionMotif: motif,
      approvedDeductionAmount: newStatus === 'APPROUVEE' ? finalAmount : 0
    };

    setSanctionCases(prev => prev.map(c => c.id === id ? updated : c));
    addAuditLog(
      newStatus === 'APPROUVEE' ? 'APPROBATION_SANCTION' : 'REJET_SANCTION',
      `${sc.matricule} - ${sc.employeeName}`,
      `Statut: ${newStatus}, Décision: ${sc.proposedSanction}, Retenue salariale: ${newStatus === 'APPROUVEE' ? finalAmount : 0} ${sc.currency}, Motif: ${motif}`
    );
  };

  return (
    <AppContext.Provider value={{
      theme,
      currentView,
      setCurrentView: goToView,
      carnetEmployee,
      openEmployeeCarnet,
      reportTab,
      reportMonth,
      openReport,
      currentUser,
      setCurrentUser,
      allUsers,
      addUser,
      updateUser,
      deleteUser,
      roles,
      addRole,
      updateRole,
      deleteRole,
      getRoleLabel,
      can,
      companySettings,
      updateCompanySettings,
      departments,
      addDepartment,
      employees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      attendanceRecords,
      correctAttendance,
      zktecoConfig,
      updateZKTecoConfig,
      applyAttendanceImport,
      workingDate,
      sanctionRules,
      addSanctionRule,
      updateSanctionRule,
      deleteSanctionRule,
      sanctionCases,
      reviewSanctionCase,
      auditLogs,
      addAuditLog,
      calculateStatus
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
