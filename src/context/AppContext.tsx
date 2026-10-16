import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Employee, Department, AttendanceRecord, AttendanceStatus, 
  ZKTecoDeviceConfig, SanctionRule, SanctionCase, AuditLog, CompanySettings,
  SyncLogEntry, AppModule, PermissionAction, RoleDefinition
} from '../types';
import { normalizeSanctionLevel } from '../types';
import { INITIAL_ROLES } from '../data/permissions';
import type { DayAttendance } from '../utils/attendanceReader';
import { caseMonth, type SanctionProposal } from '../utils/sanctions';
import { useTheme, setThemeUser } from '../theme/theme';
import { loadJSON, saveJSON, onStorageIssue, type StorageIssue } from '../utils/storage';
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
  /** Décision de la Direction sur un dossier proposé (validé ou rejeté), avec motif */
  decideSanction: (proposal: SanctionProposal, status: 'APPROUVEE' | 'REJETEE', motif: string) => void;
  
  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (action: string, target: string, details: string) => void;

  // Incidents de stockage
  storageIssues: StorageIssue[];
  dismissStorageIssues: () => void;

  // Calculation helpers
  calculateStatus: (expectedIn: string, actualIn: string | null, toleranceMin: number) => { status: AttendanceStatus; lateMinutes: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AUDIT_LOG_LIMIT = 2000;

/** Dernier jour présent dans le carnet (jour affiché par défaut à l'ouverture) */
function lastRecordDate(records: AttendanceRecord[]): string {
  const dates = records.map(r => r.date).filter(Boolean).sort();
  return dates[dates.length - 1] || new Date().toISOString().slice(0, 10);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Theme State
  // Thème clair / sombre : même moteur que PREMIDIS ERP (attribut data-theme, préférence par utilisateur)
  const { theme } = useTheme();

  // Incidents de stockage (donnée illisible mise de côté, stockage plein) affichés à l'utilisateur
  const [storageIssues, setStorageIssues] = useState<StorageIssue[]>([]);
  useEffect(() => onStorageIssue(issue => setStorageIssues(prev =>
    prev.some(p => p.kind === issue.kind && p.key === issue.key) ? prev : [...prev, issue])), []);
  const dismissStorageIssues = () => setStorageIssues([]);

  // 3. User & Navigation
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    return loadJSON('premidis_users', () => INITIAL_USERS.map(u => ({ ...u, active: true })));
  });
  const [roles, setRoles] = useState<RoleDefinition[]>(() => {
    return loadJSON('premidis_roles', () => INITIAL_ROLES);
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
    saveJSON('premidis_users', allUsers);
  }, [allUsers]);
  useEffect(() => {
    saveJSON('premidis_roles', roles);
  }, [roles]);

  useEffect(() => {
    setThemeUser(currentUser?.id || null);
  }, [currentUser?.id]);

  // Un compte désactivé ou supprimé pendant la session est déconnecté immédiatement
  useEffect(() => {
    if (!currentUser) return;
    const account = allUsers.find(u => u.id === currentUser.id);
    if (!account || account.active === false) setCurrentUser(null);
  }, [allUsers, currentUser]);

  const getRoleLabel = (roleId: string) => roles.find(r => r.id === roleId)?.label || roleId;

  const can = (module: AppModule, action: PermissionAction = 'view') => {
    if (!currentUser) return false;
    const role = roles.find(r => r.id === currentUser.role);
    return !!role?.permissions[module]?.includes(action);
  };

  /**
   * Contrôle de droit appliqué à chaque modification, en plus des boutons masqués à l'écran :
   * une action non autorisée est refusée et inscrite au journal d'audit.
   */
  const allowed = (module: AppModule, action: PermissionAction, operation: string) => {
    if (can(module, action)) return true;
    addAuditLog('ACTION_REFUSEE', operation, `Droit « ${action} » manquant sur le module ${module}`);
    return false;
  };

  const addUser = (user: Omit<User, 'id'>) => {
    if (!allowed('settings', 'edit', 'addUser')) return;
    const newUser: User = { ...user, id: `usr-${Date.now()}`, active: user.active ?? true };
    setAllUsers(prev => [...prev, newUser]);
    addAuditLog('CREATION_UTILISATEUR', newUser.email, `Rôle : ${getRoleLabel(newUser.role)}`);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    if (!allowed('settings', 'edit', 'updateUser')) return;
    setAllUsers(prev => prev.map(u => (u.id === id ? { ...u, ...data } : u)));
    if (currentUser?.id === id) setCurrentUser(prev => (prev ? { ...prev, ...data } : prev));
    const target = allUsers.find(u => u.id === id);
    const details = data.role ? `Nouveau rôle : ${getRoleLabel(data.role)}`
      : data.active !== undefined ? (data.active ? 'Compte activé' : 'Compte désactivé')
      : 'Mise à jour du compte';
    addAuditLog('MODIFICATION_UTILISATEUR', target?.email || id, details);
  };

  const deleteUser = (id: string) => {
    if (!allowed('settings', 'edit', 'deleteUser')) return;
    if (currentUser?.id === id) return; // on ne supprime pas son propre compte
    const target = allUsers.find(u => u.id === id);
    setAllUsers(prev => prev.filter(u => u.id !== id));
    addAuditLog('SUPPRESSION_UTILISATEUR', target?.email || id, 'Compte supprimé');
  };

  const addRole = (role: Omit<RoleDefinition, 'id' | 'system'>) => {
    if (!allowed('settings', 'edit', 'addRole')) return;
    const base = role.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'ROLE';
    let id = base;
    for (let i = 2; roles.some(r => r.id === id); i++) id = `${base}_${i}`;
    setRoles(prev => [...prev, { ...role, id }]);
    addAuditLog('CREATION_ROLE', role.label, role.description || 'Nouveau rôle');
  };

  const updateRole = (id: string, data: Partial<Omit<RoleDefinition, 'id' | 'system'>>) => {
    if (!allowed('settings', 'edit', 'updateRole')) return;
    if (id === 'ADMIN' && data.permissions) return; // l'administrateur garde tous les droits
    setRoles(prev => prev.map(r => (r.id === id ? { ...r, ...data } : r)));
    addAuditLog('MODIFICATION_ROLE', getRoleLabel(id), data.permissions ? 'Permissions mises à jour' : 'Rôle mis à jour');
  };

  const deleteRole = (id: string) => {
    if (!allowed('settings', 'edit', 'deleteRole')) return;
    const role = roles.find(r => r.id === id);
    if (!role || role.system || allUsers.some(u => u.role === id)) return;
    setRoles(prev => prev.filter(r => r.id !== id));
    addAuditLog('SUPPRESSION_ROLE', role.label, 'Rôle supprimé');
  };

  // 4. Data states with localStorage persistence
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    return loadJSON('premidis_settings', () => INITIAL_COMPANY_SETTINGS);
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    return loadJSON('premidis_departments', () => INITIAL_DEPARTMENTS, () => []);
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    return loadJSON('premidis_employees', () => INITIAL_EMPLOYEES, () => []);
  });

  const [workingDate, setWorkingDate] = useState<string>(() => {
    return loadJSON<string>('premidis_working_date', () => lastRecordDate(loadJSON<AttendanceRecord[]>('premidis_attendance', generateMockAttendance)));
  });
  useEffect(() => { saveJSON('premidis_working_date', workingDate); }, [workingDate]);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = loadJSON<unknown[] | null>('premidis_attendance', () => null, () => []);
    if (!saved) return generateMockAttendance();
    // Anciennes données de démonstration : « 08:-4 » corrigé en « 07:56 »
    const fix = (t: string | null) => {
      const m = t?.match(/^(\d{2}):(-\d+)$/);
      if (!m) return t;
      const total = Number(m[1]) * 60 + Number(m[2]);
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };
    return (saved as AttendanceRecord[]).map(r => ({ ...r, actualCheckIn: fix(r.actualCheckIn), actualCheckOut: fix(r.actualCheckOut) }));
  });

  const [zktecoConfig, setZKTecoConfig] = useState<ZKTecoDeviceConfig>(() => {
    return loadJSON('premidis_zkteco', () => INITIAL_ZKTECO_CONFIG);
  });

  const [sanctionRules, setSanctionRules] = useState<SanctionRule[]>(() => {
    const saved = loadJSON<unknown[] | null>('premidis_sanction_rules', () => null, () => []);
    if (!saved) return INITIAL_SANCTION_RULES;
    return (saved as SanctionRule[]).map(r => ({ ...r, sanctionType: normalizeSanctionLevel(r.sanctionType, r.deductionAmount) }));
  });

  const [sanctionCases, setSanctionCases] = useState<SanctionCase[]>(() => {
    const saved = loadJSON<unknown[] | null>('premidis_sanction_cases', () => null, () => []);
    if (!saved) return INITIAL_SANCTION_CASES;
    return (saved as SanctionCase[]).map(c => ({ ...c, proposedSanction: normalizeSanctionLevel(c.proposedSanction, c.deductionAmount) }));
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    return loadJSON('premidis_audit_logs', () => INITIAL_AUDIT_LOGS, () => []);
  });

  // Save to localStorage when updated
  useEffect(() => {
    saveJSON('premidis_settings', companySettings);
  }, [companySettings]);

  useEffect(() => {
    saveJSON('premidis_departments', departments);
  }, [departments]);

  useEffect(() => {
    saveJSON('premidis_employees', employees);
  }, [employees]);

  useEffect(() => {
    saveJSON('premidis_attendance', attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    saveJSON('premidis_zkteco', zktecoConfig);
  }, [zktecoConfig]);

  useEffect(() => {
    saveJSON('premidis_sanction_rules', sanctionRules);
  }, [sanctionRules]);

  useEffect(() => {
    saveJSON('premidis_sanction_cases', sanctionCases);
  }, [sanctionCases]);

  useEffect(() => {
    saveJSON('premidis_audit_logs', auditLogs);
  }, [auditLogs]);

  // Audit Log Helper
  const addAuditLog = (action: string, target: string, details: string) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'Système',
      userRole: currentUser?.role || 'SYSTEME',
      action,
      target,
      details
    };
    // Les 2 000 derniers événements sont conservés (le journal ne remplit pas le stockage)
    setAuditLogs(prev => [newLog, ...prev].slice(0, AUDIT_LOG_LIMIT));
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
    if (!allowed('employees', 'create', 'addEmployee')) return;
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`
    };
    setEmployees(prev => [...prev, newEmp]);
    addAuditLog('CREATION_EMPLOYE', `${newEmp.matricule} - ${newEmp.nom} ${newEmp.prenom}`, `Département: ${newEmp.departement}`);
  };

  const updateEmployee = (id: string, empData: Partial<Employee>) => {
    if (!allowed('employees', 'edit', 'updateEmployee')) return;
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    const next = { ...emp, ...empData };
    setEmployees(prev => prev.map(e => e.id === id ? next : e));
    // Le carnet et les dossiers suivent le matricule, le nom et le département de l'employé
    const fullName = `${next.nom} ${next.postnom} ${next.prenom}`;
    if (next.matricule !== emp.matricule || fullName !== `${emp.nom} ${emp.postnom} ${emp.prenom}` || next.departement !== emp.departement) {
      setAttendanceRecords(prev => prev.map(r => r.employeeId === emp.matricule
        ? { ...r, employeeId: next.matricule, employeeName: fullName, department: next.departement, id: r.id.replace(emp.matricule, next.matricule) }
        : r));
      setSanctionCases(prev => prev.map(c => c.employeeId === emp.matricule || c.matricule === emp.matricule
        ? { ...c, employeeId: next.matricule, matricule: next.matricule, employeeName: fullName, department: next.departement }
        : c));
    }
    addAuditLog('MODIFICATION_EMPLOYE', next.matricule, emp.matricule !== next.matricule ? `Matricule ${emp.matricule} → ${next.matricule}` : 'Mise à jour du dossier employé');
  };

  const deleteEmployee = (id: string) => {
    if (!allowed('employees', 'delete', 'deleteEmployee')) return;
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setEmployees(prev => prev.filter(e => e.id !== id));
      addAuditLog('SUPPRESSION_EMPLOYE', emp.matricule, `Suppression de l'employé ${emp.nom} ${emp.prenom}`);
    }
  };

  // Department Actions
  const addDepartment = (depData: Omit<Department, 'id'>) => {
    if (!allowed('settings', 'create', 'addDepartment')) return;
    const newDep: Department = {
      ...depData,
      id: `dep-${Date.now()}`
    };
    setDepartments(prev => [...prev, newDep]);
    addAuditLog('CREATION_DEPARTEMENT', newDep.name, `Code: ${newDep.code}`);
  };



  // Attendance Actions
  const correctAttendance = (recordId: string, newCheckIn: string | null, newCheckOut: string | null, reason: string) => {
    if (!allowed('attendance', 'edit', 'correctAttendance')) return;
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
    if (!allowed('settings', 'edit', 'updateCompanySettings')) return;
    setCompanySettings(prev => ({ ...prev, ...newSettings }));
    addAuditLog('PARAMETRES_ENTREPRISE', 'Configuration', 'Mise à jour des paramètres généraux');
  };

  const updateZKTecoConfig = (config: Partial<ZKTecoDeviceConfig>) => {
    if (!allowed('settings', 'edit', 'updateZKTecoConfig')) return;
    setZKTecoConfig(prev => ({ ...prev, ...config }));
    addAuditLog('PARAMETRES_ZKTECO', 'Appareil de pointage', 'Mise à jour de la configuration ZKTeco');
  };

  const applyAttendanceImport = (fileName: string, days: DayAttendance[], warnings: string[] = []) => {
    if (!allowed('attendance', 'create', 'applyAttendanceImport')) return { count: 0, absents: 0, dates: [] };
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
    if (!allowed('sanctions', 'create', 'addSanctionRule')) return;
    const newRule: SanctionRule = {
      ...ruleData,
      id: `rule-${Date.now()}`
    };
    setSanctionRules(prev => [...prev, newRule]);
    addAuditLog('CREATION_REGLE_SANCTION', newRule.name, `Seuil: ${newRule.thresholdLateCount} retards`);
  };

  const updateSanctionRule = (id: string, ruleData: Partial<SanctionRule>) => {
    if (!allowed('sanctions', 'edit', 'updateSanctionRule')) return;
    setSanctionRules(prev => prev.map(r => r.id === id ? { ...r, ...ruleData } : r));
    addAuditLog('MODIFICATION_REGLE_SANCTION', id, 'Mise à jour des critères de sanction');
  };

  const deleteSanctionRule = (id: string) => {
    if (!allowed('sanctions', 'delete', 'deleteSanctionRule')) return;
    setSanctionRules(prev => prev.filter(r => r.id !== id));
    addAuditLog('SUPPRESSION_REGLE_SANCTION', id, 'Suppression d\'un barème de sanction');
  };

  const decideSanction = (proposal: SanctionProposal, status: 'APPROUVEE' | 'REJETEE', motif: string) => {
    if (!allowed('sanctions', 'validate', 'decideSanction')) return;
    const { emp, month, rule } = proposal;
    const id = `case-${emp.matricule}-${month}`;
    const decided: SanctionCase = {
      id,
      employeeId: emp.matricule,
      matricule: emp.matricule,
      employeeName: `${emp.nom} ${emp.postnom} ${emp.prenom}`,
      department: emp.departement,
      period: month,
      lateCount: proposal.lateCount,
      totalMinutesLate: proposal.lateMinutes,
      datesLate: proposal.lateDates,
      absenceCount: proposal.absences,
      datesAbsent: proposal.absenceDates,
      ruleId: rule.id,
      ruleName: rule.name,
      proposedSanction: rule.sanctionType,
      deductionAmount: rule.deductionAmount,
      approvedDeductionAmount: status === 'APPROUVEE' ? rule.deductionAmount : 0,
      currency: rule.currency,
      status,
      decisionDate: new Date().toISOString().substring(0, 10),
      decidedBy: currentUser ? `${currentUser.name} (${getRoleLabel(currentUser.role)})` : 'Direction',
      decisionMotif: motif,
      createdAt: new Date().toISOString(),
    };
    // Une seule décision par employé et par mois (les anciens dossiers du même mois sont remplacés)
    setSanctionCases(prev => [decided, ...prev.filter(c => !((c.matricule === emp.matricule || c.employeeId === emp.matricule) && caseMonth(c.period) === month))]);
    addAuditLog(status === 'APPROUVEE' ? 'APPROBATION_SANCTION' : 'REJET_SANCTION', `${emp.matricule} - ${month}`,
      `${rule.name} · ${rule.sanctionType}${rule.exclusionDays ? ` (${rule.exclusionDays} j)` : ''}${rule.deductionAmount ? ` · ${rule.deductionAmount} ${rule.currency}` : ''} · Motif : ${motif}`);
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
      decideSanction,
      auditLogs,
      addAuditLog,
      calculateStatus,
      storageIssues,
      dismissStorageIssues
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
