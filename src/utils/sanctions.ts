// Calcul unique des sanctions : utilisé par le tableau de bord, le module Sanctions (dossiers à valider),
// le rapport mensuel des sanctions et le badge du menu. Les seuils viennent toujours des barèmes actifs.
import type { AttendanceRecord, Employee, SanctionCase, SanctionLevel, SanctionRule } from '../types';

/** Du moins lourd au plus lourd */
export const SANCTION_ORDER: SanctionLevel[] = ['AVERTISSEMENT_VERBAL', 'RETENUE_SALARIALE_PROPOSEE', 'EXCLUSION_TEMPORAIRE'];

/** Poids d'un barème : l'exclusion temporaire d'abord (et sa durée), puis la retenue, puis le niveau */
export const sanctionWeight = (r: Pick<SanctionRule, 'sanctionType' | 'deductionAmount' | 'exclusionDays'>) =>
  (r.sanctionType === 'EXCLUSION_TEMPORAIRE' ? 100000 + (r.exclusionDays || 1) * 1000 : 0)
  + r.deductionAmount * 10
  + SANCTION_ORDER.indexOf(r.sanctionType);

export interface SanctionProposal {
  emp: Employee;
  /** Mois concerné, AAAA-MM */
  month: string;
  lateCount: number;
  lateMinutes: number;
  lateDates: string[];
  absences: number;
  absenceDates: string[];
  /** Barème le plus lourd atteint */
  rule: SanctionRule;
  /** Décision déjà prise par la Direction pour ce mois, s'il y en a une */
  decision: SanctionCase | null;
}

const MONTHS_FR = ['janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre', 'decembre'];
const MONTH_INDEX: Record<string, number> = {
  janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, août: 8, aout: 8,
  septembre: 9, octobre: 10, novembre: 11, décembre: 12, decembre: 12,
};

/** Période d'un dossier → AAAA-MM (« 2026-10 » ou « Octobre 2026 ») */
export function caseMonth(period: string): string | null {
  const iso = period.match(/(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const p = period.toLowerCase();
  const name = MONTHS_FR.find(m => p.includes(m));
  const year = p.match(/\d{4}/)?.[0];
  return name && year ? `${year}-${String(MONTH_INDEX[name]).padStart(2, '0')}` : null;
}

/** Décision de la Direction (validée ou rejetée) pour un employé et un mois */
export function findDecision(cases: SanctionCase[], matricule: string, month: string): SanctionCase | null {
  return cases.find(c => (c.matricule === matricule || c.employeeId === matricule)
    && (c.status === 'APPROUVEE' || c.status === 'REJETEE')
    && caseMonth(c.period) === month) || null;
}

/** Un barème est-il atteint avec ces chiffres ? */
export function ruleReached(rule: SanctionRule, lateCount: number, lateMinutes: number, absences: number): boolean {
  const lateOk = lateCount >= Math.max(1, rule.thresholdLateCount) && lateMinutes >= rule.thresholdLateMinutes;
  const absOk = absences >= Math.max(1, rule.thresholdAbsenceCount);
  if (rule.targetType === 'RETARD') return lateOk;
  if (rule.targetType === 'ABSENCE') return absOk;
  return lateOk && absOk;
}

/**
 * Employés ayant atteint au moins un barème actif, du 1er du mois jusqu'à `upTo` inclus
 * (fin du mois si absent). Classés du cas le plus lourd au plus léger.
 */
export function evaluateSanctions(
  employees: Employee[],
  records: AttendanceRecord[],
  rules: SanctionRule[],
  month: string,
  upTo?: string,
  cases: SanctionCase[] = [],
): SanctionProposal[] {
  const end = upTo && upTo.startsWith(month) ? upTo : `${month}-31`;
  const active = rules.filter(r => r.isActive);
  const inMonth = records.filter(r => r.date.startsWith(month) && r.date <= end);
  const out: SanctionProposal[] = [];
  employees.forEach(emp => {
    const mine = inMonth.filter(r => r.employeeId === emp.matricule);
    const late = mine.filter(r => r.status === 'RETARD');
    const absent = mine.filter(r => r.status === 'ABSENT');
    const lateMinutes = late.reduce((n, r) => n + r.lateMinutes, 0);
    const hits = active.filter(rule => ruleReached(rule, late.length, lateMinutes, absent.length));
    if (!hits.length) return;
    const rule = [...hits].sort((a, b) => sanctionWeight(b) - sanctionWeight(a))[0];
    out.push({
      emp, month,
      lateCount: late.length, lateMinutes, lateDates: late.map(r => r.date).sort(),
      absences: absent.length, absenceDates: absent.map(r => r.date).sort(),
      rule,
      decision: findDecision(cases, emp.matricule, month),
    });
  });
  return out.sort((a, b) => sanctionWeight(b.rule) - sanctionWeight(a.rule) || b.lateMinutes - a.lateMinutes || b.absences - a.absences);
}

/** Libellé court de la sanction d'un barème (« Exclusion temporaire · 3 j », « Retenue compensatoire… ») */
export function sanctionText(rule: Pick<SanctionRule, 'sanctionType' | 'exclusionDays'>, labels: Record<string, string>): string {
  const base = labels[rule.sanctionType] ?? rule.sanctionType;
  return rule.sanctionType === 'EXCLUSION_TEMPORAIRE' ? `${base} · ${rule.exclusionDays || 1} j` : base;
}
