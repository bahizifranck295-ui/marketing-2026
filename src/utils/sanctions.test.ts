import { describe, expect, it } from 'vitest';
import type { AttendanceRecord, Employee, SanctionCase, SanctionRule } from '../types';
import { INITIAL_ROLES } from '../data/permissions';
import { caseMonth, evaluateSanctions, findDecision, ruleReached, sanctionText, sanctionWeight } from './sanctions';

const emp = (matricule: string): Employee => ({
  id: matricule, matricule, nom: matricule, postnom: '', prenom: '', departement: 'RH', poste: '', email: '', telephone: '',
  dateEmbauche: '2024-01-01', heureEntreeNormale: '08:00', heureSortieNormale: '16:00', toleranceMinutes: 10, zktecoBioId: matricule, statutAdministratif: 'ACTIF',
});
const rec = (employeeId: string, date: string, status: AttendanceRecord['status'], lateMinutes = 0): AttendanceRecord => ({
  id: `${employeeId}-${date}`, employeeId, employeeName: employeeId, department: 'RH', date, expectedCheckIn: '08:00',
  actualCheckIn: status === 'ABSENT' ? null : '08:30', lateMinutes, expectedCheckOut: '16:00', actualCheckOut: null,
  earlyDepartureMinutes: 0, status, source: 'FILE_IMPORT',
} as AttendanceRecord);
const rule = (r: Partial<SanctionRule>): SanctionRule => ({
  id: 'r', name: 'r', targetType: 'RETARD', period: 'MONTH', thresholdLateCount: 0, thresholdLateMinutes: 0, thresholdAbsenceCount: 0,
  sanctionType: 'AVERTISSEMENT_VERBAL', deductionAmount: 0, currency: 'USD', isActive: true, effectiveDate: '2026-01-01', description: '', ...r,
});

const RULES = [
  rule({ id: 'avert', targetType: 'RETARD', thresholdLateCount: 3, sanctionType: 'AVERTISSEMENT_VERBAL' }),
  rule({ id: 'retenue', targetType: 'ABSENCE', thresholdAbsenceCount: 2, sanctionType: 'RETENUE_SALARIALE_PROPOSEE', deductionAmount: 30 }),
  rule({ id: 'excl', targetType: 'ABSENCE', thresholdAbsenceCount: 4, sanctionType: 'EXCLUSION_TEMPORAIRE', exclusionDays: 3 }),
  rule({ id: 'gelé', targetType: 'RETARD', thresholdLateCount: 1, sanctionType: 'EXCLUSION_TEMPORAIRE', isActive: false }),
];

describe('sanctions', () => {
  it('ordre de gravité : exclusion > retenue > avertissement', () => {
    expect(sanctionWeight(RULES[2])).toBeGreaterThan(sanctionWeight(RULES[1]));
    expect(sanctionWeight(RULES[1])).toBeGreaterThan(sanctionWeight(RULES[0]));
  });

  it('seuils : un barème à 0 n’est jamais atteint sans événement', () => {
    expect(ruleReached(rule({ targetType: 'RETARD' }), 0, 0, 0)).toBe(false);
    expect(ruleReached(rule({ targetType: 'RETARD', thresholdLateCount: 3, thresholdLateMinutes: 60 }), 3, 59, 0)).toBe(false);
    expect(ruleReached(rule({ targetType: 'COMBINE', thresholdLateCount: 1, thresholdAbsenceCount: 1 }), 1, 5, 1)).toBe(true);
  });

  it('retient le barème actif le plus lourd, ignore les barèmes gelés et les autres mois', () => {
    const records = [
      rec('A', '2026-10-01', 'RETARD', 20), rec('A', '2026-10-02', 'RETARD', 20), rec('A', '2026-10-03', 'RETARD', 20),
      ...['05', '06', '07', '08'].map(d => rec('B', `2026-10-${d}`, 'ABSENT')),
      rec('C', '2026-10-01', 'RETARD', 50), rec('C', '2026-09-30', 'ABSENT'), rec('C', '2026-09-29', 'ABSENT'),
    ];
    const out = evaluateSanctions([emp('A'), emp('B'), emp('C')], records, RULES, '2026-10');
    expect(out.map(p => [p.emp.matricule, p.rule.id])).toEqual([['B', 'excl'], ['A', 'avert']]);
    expect(out[0].absenceDates).toHaveLength(4);
  });

  it('s’arrête à la date de travail pour le mois en cours', () => {
    const records = ['05', '06', '20'].map(d => rec('B', `2026-10-${d}`, 'ABSENT'));
    expect(evaluateSanctions([emp('B')], records, RULES, '2026-10', '2026-10-10')[0].absences).toBe(2);
  });

  it('décision de la Direction retrouvée par mois, quel que soit le format de période', () => {
    expect(caseMonth('Octobre 2026')).toBe('2026-10');
    expect(caseMonth('2026-10')).toBe('2026-10');
    const decided = { matricule: 'B', employeeId: 'B', period: 'Octobre 2026', status: 'APPROUVEE' } as SanctionCase;
    expect(findDecision([decided], 'B', '2026-10')).toBe(decided);
    expect(findDecision([{ ...decided, status: 'PROPOSEE' }], 'B', '2026-10')).toBeNull();
    expect(findDecision([decided], 'B', '2026-11')).toBeNull();
  });

  it('libellé de l’exclusion avec sa durée', () => {
    expect(sanctionText(RULES[2], { EXCLUSION_TEMPORAIRE: 'Exclusion temporaire' })).toBe('Exclusion temporaire · 3 j');
  });
});

describe('rôles par défaut', () => {
  const role = (id: string) => INITIAL_ROLES.find(r => r.id === id)!.permissions;
  it('seul l’administrateur modifie les paramètres', () => {
    INITIAL_ROLES.forEach(r => expect(r.permissions.settings.includes('edit')).toBe(r.id === 'ADMIN'));
  });
  it('le Directeur consulte et valide sans rien modifier', () => {
    Object.values(role('DIRECTEUR')).forEach(actions => {
      expect(actions.some(a => a === 'create' || a === 'edit' || a === 'delete')).toBe(false);
    });
    expect(role('DIRECTEUR').sanctions).toContain('validate');
  });
  it('les RH ne valident pas leurs propres propositions de sanction', () => {
    expect(role('RH').sanctions).not.toContain('validate');
  });
});
