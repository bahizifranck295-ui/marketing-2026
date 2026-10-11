export type AttendanceStatus = 'PRESENT' | 'RETARD' | 'ABSENT';

export type UserRole = 'ADMIN' | 'SECRETAIRE' | 'RH' | 'DIRECTEUR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
}

export type AdministrativeStatus = 'ACTIF' | 'INACTIF' | 'SUSPENDU';

export interface Employee {
  id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  photoUrl?: string;
  departement: string;
  poste: string;
  email: string;
  telephone: string;
  dateEmbauche: string;
  heureEntreeNormale: string; // e.g. "08:30"
  heureSortieNormale: string; // e.g. "16:30"
  toleranceMinutes: number; // e.g. 10
  zktecoBioId: string; // e.g. "101"
  statutAdministratif: AdministrativeStatus;
}

export type PunchSource = 'ZKTECO_BIOMETRIC' | 'MANUAL' | 'FILE_IMPORT';

export interface AttendanceRecord {
  id: string;
  employeeId: string; // matricule
  employeeName: string;
  department: string;
  date: string; // YYYY-MM-DD
  expectedCheckIn: string; // HH:mm
  actualCheckIn: string | null; // HH:mm
  lateMinutes: number;
  expectedCheckOut: string; // HH:mm
  actualCheckOut: string | null; // HH:mm
  earlyDepartureMinutes: number;
  status: AttendanceStatus; // STRICTLY: 'PRESENT' | 'RETARD' | 'ABSENT'
  source: PunchSource;
  notes?: string;
  justification?: string;
  isCorrected?: boolean;
  correctedBy?: string;
  correctionReason?: string;
  correctionDate?: string;
  rawPunchInTime?: string | null;
  rawPunchOutTime?: string | null;
  verifiedByGuardOrSec?: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  manager: string;
  employeeCount?: number;
  defaultEntrance: string;
  defaultExit: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'AUTO_SCHEDULED' | 'MANUAL_TRIGGER' | 'USB_FILE_IMPORT';
  punchesImported: number;
  newPunches: number;
  duplicatesSkipped: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  message: string;
  operatorName?: string;
}

export interface ZKTecoDeviceConfig {
  brand: string;
  model: string;
  ipAddress: string;
  port: number;
  commKey: string;
  connectionType: 'DIRECT_TCP' | 'SOFTWARE_SYNC' | 'USB_FILE';
  status: 'ONLINE' | 'OFFLINE' | 'SYNCHRONIZING' | 'ERROR';
  lastSyncTime: string;
  lastPunchImportedTime: string;
  importedPunchesCount: number;
  errorCount: number;
  firmwareVersion?: string;
  serialNumber?: string;
  deviceUserCount?: number;
  deviceFingerprintCount?: number;
  autoSyncIntervalMinutes: number;
  syncLogs: SyncLogEntry[];
}

export type SanctionLevel = 
  | 'AVERTISSEMENT_VERBAL'
  | 'AVERTISSEMENT_ECRIT'
  | 'BLAME'
  | 'MISE_A_PIED_PROPOSEE'
  | 'RETENUE_SALARIALE_PROPOSEE';

export type SanctionTargetType = 'RETARD' | 'ABSENCE' | 'COMBINE';

export interface SanctionRule {
  id: string;
  name: string;
  targetType: SanctionTargetType; // 'RETARD' | 'ABSENCE' | 'COMBINE'
  period: 'WEEK' | 'MONTH';
  thresholdLateCount: number; // e.g. 3 retards
  thresholdLateMinutes: number; // e.g. 45 mins
  thresholdAbsenceCount: number; // e.g. 1 absence non justifiée
  sanctionType: SanctionLevel;
  deductionAmount: number; // Somme d'argent retirable / déductible
  currency: 'USD' | 'CDF';
  isActive: boolean;
  effectiveDate: string;
  description: string;
}

export type SanctionStatus = 'PROPOSEE' | 'EN_EXAMEN' | 'APPROUVEE' | 'REJETEE';

export interface SanctionCase {
  id: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  department: string;
  period: string; // e.g. "Octobre 2026"
  lateCount: number;
  totalMinutesLate: number;
  datesLate: string[];
  absenceCount: number; // Nombre d'absences non justifiées
  datesAbsent: string[];
  ruleId: string;
  ruleName: string;
  proposedSanction: SanctionLevel;
  deductionAmount: number; // Somme d'argent retirable calculée
  approvedDeductionAmount?: number; // Somme d'argent retirable validée par la Direction
  currency: 'USD' | 'CDF';
  status: SanctionStatus;
  justificationNotes?: string;
  decisionDate: string | null;
  decidedBy: string | null;
  decisionMotif?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  target: string;
  details: string;
}

export interface CompanySettings {
  companyName: string;
  companySubName: string;
  address: string;
  rccm: string;
  phone: string;
  whatsapp: string;
  email: string;
  timezone: string;
  defaultExpectedCheckIn: string;
  defaultExpectedCheckOut: string;
  defaultToleranceMinutes: number;
  workingDays: number[]; // 1: Mon, 2: Tue, etc.
  allowManualCorrections: boolean;
  requireCorrectionReason: boolean;
  currency: 'USD' | 'CDF';
}
