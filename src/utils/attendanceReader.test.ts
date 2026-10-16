import { describe, expect, it } from 'vitest';
import type { Employee } from '../types';
import { absentCandidates, decodeText, groupByDay, readAttendanceRows, readDate, readTime, textToRows } from './attendanceReader';

const emp = (id: string, matricule: string, bio: string, nom: string, postnom: string, prenom: string, statut: Employee['statutAdministratif'] = 'ACTIF'): Employee => ({
  id, matricule, nom, postnom, prenom, departement: 'RH', poste: 'Agent', email: '', telephone: '', dateEmbauche: '2024-01-01',
  heureEntreeNormale: '08:00', heureSortieNormale: '16:00', toleranceMinutes: 10, zktecoBioId: bio, statutAdministratif: statut,
});
const STAFF = [
  emp('1', 'PRM-001', '1', 'KABONGO', 'MUTEBA', 'Jean'),
  emp('2', 'PRM-002', '2', 'MBUYI', 'KALALA', 'Marie'),
  emp('3', 'PRM-003', '3', 'TSHIBANDA', 'NGOY', 'Paul'),
  emp('4', 'PRM-004', '4', 'LUKUSA', 'ILUNGA', 'Ruth', 'SUSPENDU' as Employee['statutAdministratif']),
];

describe('readDate', () => {
  it('lit les formats courants', () => {
    expect(readDate('2026-10-11')).toBe('2026-10-11');
    expect(readDate('11/10/2026')).toBe('2026-10-11');
    expect(readDate('2026/10/11')).toBe('2026-10-11');
    expect(readDate('11.10.2026')).toBe('2026-10-11');
  });
  it('refuse une date absente du calendrier', () => {
    expect(readDate('31/02/2026')).toBeNull();
    expect(readDate('2026-04-31')).toBeNull();
    expect(readDate('29/02/2026')).toBeNull();
    expect(readDate('29/02/2028')).toBe('2028-02-29');
    expect(readDate('00/10/2026')).toBeNull();
  });
});

describe('readTime', () => {
  it('lit H:MM, HH:MM:SS et 08h12', () => {
    expect(readTime('8:05')).toBe('08:05');
    expect(readTime('08:12:45')).toBe('08:12');
    expect(readTime('08h12')).toBe('08:12');
  });
  it('n’accepte le point que pour l’OCR', () => {
    expect(readTime('12.50')).toBeNull();
    expect(readTime('12.50', true)).toBe('12:50');
  });
  it('refuse une heure impossible', () => {
    expect(readTime('24:00')).toBeNull();
    expect(readTime('08:60')).toBeNull();
  });
});

describe('readAttendanceRows : fidélité au fichier de la pointeuse', () => {
  it('fichier AttLog : chaque ligne est comptée, aucune n’est perdue', () => {
    const text = [
      '        1\t2026-10-12 08:02:11\t1\t0\t1\t0',
      '        1\t2026-10-12 16:35:40\t1\t1\t1\t0',
      '        2\t2026-10-12 08:21:03\t1\t0\t1\t0',
      '       99\t2026-10-12 08:30:00\t1\t0\t1\t0',
      '',
      'Rapport de pointage',
    ].join('\n');
    const r = readAttendanceRows(textToRows(text), STAFF);
    expect(r.totalLines).toBe(5);
    expect(r.rows).toHaveLength(3);
    expect(r.unknown).toHaveLength(1);
    expect(r.unknown[0].raw).toContain('99');
    expect(r.ignored).toHaveLength(1);
    expect(r.rows.length + r.unknown.length + r.ignored.length).toBe(r.totalLines);
  });

  it('zéros de tête de l’ID pointeuse', () => {
    const r = readAttendanceRows([['0002', '12/10/2026', '07:58']], STAFF);
    expect(r.rows[0].emp.matricule).toBe('PRM-002');
    expect(r.rows[0].matchedBy).toBe('id');
  });

  it('« 12.50 » dans un fichier n’est pas une heure', () => {
    const r = readAttendanceRows([['PRM-001', '12/10/2026', '12.50']], STAFF);
    expect(r.rows).toHaveLength(0);
    expect(r.ignored).toHaveLength(1);
  });

  it('date impossible → ligne à vérifier, jamais importée', () => {
    const r = readAttendanceRows([['PRM-001', '31/02/2026', '08:00']], STAFF);
    expect(r.rows).toHaveLength(0);
    expect(r.unknown[0].hint).toMatch(/Date impossible/);
  });

  it('ID et nom qui désignent deux personnes → à vérifier', () => {
    const r = readAttendanceRows([['1', 'MBUYI KALALA Marie', '12/10/2026', '08:00']], STAFF);
    expect(r.rows).toHaveLength(0);
    expect(r.unknown[0].hint).toMatch(/ID pointeuse 1/);
  });

  it('reconnaissance par le nom seul (deux parties au moins)', () => {
    const r = readAttendanceRows([['TSHIBANDA NGOY Paul', '12/10/2026', '08:40', '16:10']], STAFF);
    expect(r.rows[0].emp.matricule).toBe('PRM-003');
    expect(r.rows[0].matchedBy).toBe('nom');
    expect(r.rows[0].times).toEqual(['08:40', '16:10']);
  });

  it('date du titre utilisée pour les lignes sans date', () => {
    const r = readAttendanceRows([['Rapport du 12/10/2026'], ['PRM-001', '08:05']], STAFF);
    expect(r.rows[0].date).toBe('2026-10-12');
  });

  it('sans date nulle part → à vérifier', () => {
    const r = readAttendanceRows([['PRM-001', '08:05']], STAFF);
    expect(r.unknown[0].hint).toMatch(/Date introuvable/);
  });

  it('matricule O/0 corrigé uniquement en OCR', () => {
    expect(readAttendanceRows([['PRM-OO1', '12/10/2026', '08:05']], STAFF).rows).toHaveLength(0);
    expect(readAttendanceRows([['PRM-OO1', '12/10/2026', '08:05']], STAFF, { ocr: true }).rows[0].emp.matricule).toBe('PRM-001');
  });
});

describe('groupByDay', () => {
  it('garde tous les pointages et compte les doublons', () => {
    const r = readAttendanceRows([
      ['1', '2026-10-12', '08:02'], ['1', '2026-10-12', '08:02'], ['1', '2026-10-12', '12:10'], ['1', '2026-10-12', '16:35'],
    ], STAFF);
    const [d] = groupByDay(r.rows);
    expect(d.punches).toEqual(['08:02', '12:10', '16:35']);
    expect(d.duplicates).toBe(1);
    expect(d.checkIn).toBe('08:02');
    expect(d.checkOut).toBe('16:35');
    expect(d.lines).toEqual([1, 2, 3, 4]);
  });
  it('pas de sortie inventée quand le second pointage est trop proche', () => {
    const [d] = groupByDay(readAttendanceRows([['1', '2026-10-12', '08:02', '08:10']], STAFF).rows);
    expect(d.checkOut).toBeNull();
    expect(d.punches).toEqual(['08:02', '08:10']);
  });
  it('confiance OCR la plus basse du jour', () => {
    const rows = readAttendanceRows([['1', '2026-10-12', '08:02'], ['1', '2026-10-12', '16:40']], STAFF, { ocr: true, confidences: [0.95, 0.6] }).rows;
    expect(groupByDay(rows)[0].confidence).toBe(0.6);
  });
});

describe('absentCandidates', () => {
  const days = groupByDay(readAttendanceRows([['1', '2026-10-12', '08:02'], ['1', '2026-10-11', '08:02']], STAFF).rows);
  it('agents actifs sans pointage, jours ouvrés seulement, sans écraser le carnet', () => {
    // 12/10/2026 = lundi, 11/10/2026 = dimanche
    const out = absentCandidates(days, STAFF, new Set(['PRM-003|2026-10-12']), [1, 2, 3, 4, 5]);
    expect(out.map(a => `${a.emp.matricule}|${a.date}`)).toEqual(['PRM-002|2026-10-12']);
  });
});

describe('decodeText', () => {
  it('UTF-8, UTF-8 avec BOM, UTF-16 et Windows-1252', () => {
    const enc = new TextEncoder();
    expect(decodeText(enc.encode('Kabongo é').buffer)).toBe('Kabongo é');
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...enc.encode('é')]).buffer)).toBe('é');
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0xe9, 0x00]).buffer)).toBe('Aé');
    expect(decodeText(new Uint8Array([0x41, 0xe9]).buffer)).toBe('Aé');
  });
});
