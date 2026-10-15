// Lecture d'un relevé de pointage, quelle que soit sa forme : fichier AttLog de la clé USB, liste CSV,
// classeur Excel ou texte lu par l'OCR sur une photo ou un PDF du rapport de la pointeuse.
// Chaque ligne est découpée en mots ; on y cherche une date, une ou plusieurs heures, puis la personne :
// par matricule (PRM-001), par ID pointeuse (première valeur numérique) ou par son nom.
import type { Employee } from '../types';

export interface ReadPunchRow {
  line: number;
  raw: string;
  date: string;     // AAAA-MM-JJ
  times: string[];  // HH:MM
  emp: Employee;
  matchedBy: 'matricule' | 'id' | 'nom';
}
export interface ReadResult {
  rows: ReadPunchRow[];
  /** Lignes avec heure mais sans agent reconnu (à vérifier) */
  unknown: { line: number; raw: string; hint: string }[];
  /** Lignes sans date ni heure (titres, en-têtes) */
  ignored: number;
}

const pad = (n: number | string) => String(n).padStart(2, '0');

/** Identifiant de pointeuse sans zéros de tête (« 0007 » et « 7 » désignent la même personne) */
export const normalizeUserId = (id: string) => id.trim().replace(/^0+(?=\d)/, '');

/** Date AAAA-MM-JJ à partir de AAAA-MM-JJ, AAAA/MM/JJ, JJ/MM/AAAA, JJ-MM-AAAA ou JJ.MM.AAAA */
export function readDate(token: string): string | null {
  let m = token.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let y: string, mo: string, d: string;
  if (m) [, y, mo, d] = m;
  else if ((m = token.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [, d, mo, y] = m;
  else return null;
  // Format américain MM/JJ/AAAA reconnu quand le « mois » dépasse 12
  if (+mo > 12 && +d <= 12) [mo, d] = [d, mo];
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Heure HH:MM à partir de H:MM, HH:MM:SS, 08h12 ou 08.12 (l'OCR confond parfois « : » et « . ») */
export function readTime(token: string): string | null {
  const m = token.match(/^(\d{1,2})[:hH.](\d{2})(?:[:.]\d{2})?$/);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return `${pad(m[1])}:${m[2]}`;
}

/** Majuscules sans accents ni ponctuation, pour comparer des noms lus par l'OCR */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

/** Corrige les confusions courantes de l'OCR dans un matricule (O/0, I/1) : « PRM-OO1 » → « PRM-001 » */
const fixMatricule = (s: string) => s.toUpperCase().replace(/^([A-Z]+)[-_ ]?([0-9OIL]+)$/, (_, p, n) => `${p}-${n.replace(/O/g, '0').replace(/[IL]/g, '1')}`);

function findByName(text: string, employees: Employee[]): Employee | null {
  const words = new Set(plain(text).split(' '));
  const glued = plain(text).replace(/ /g, '');
  let best: Employee | null = null, bestScore = 0, tie = false;
  employees.forEach(e => {
    const parts = [e.nom, e.postnom, e.prenom].map(plain).filter(p => p.length >= 3);
    // Un nom est reconnu s'il apparaît comme mot, ou collé à un autre (l'OCR perd parfois l'espace)
    const score = parts.filter(p => words.has(p) || (p.length >= 4 && glued.includes(p))).length;
    if (score > bestScore) { best = e; bestScore = score; tie = false; }
    else if (score === bestScore && score > 0) tie = true;
  });
  // Deux parties du nom au moins (nom + postnom, nom + prénom…), et une seule personne possible
  return bestScore >= 2 && !tie ? best : null;
}

/**
 * @param rows lignes du document, déjà découpées en cellules
 * @param employees registre du personnel
 */
export function readAttendanceRows(rows: string[][], employees: Employee[]): ReadResult {
  const out: ReadResult = { rows: [], unknown: [], ignored: 0 };
  let contextDate: string | null = null; // date d'un titre (« Rapport du 11/10/2026 ») pour les lignes qui n'en ont pas

  rows.forEach((cells, idx) => {
    const raw = cells.map(c => String(c ?? '').trim()).filter(Boolean).join('  ');
    if (!raw) return;
    // « 2026-10-11 08:12:15 » ou « 11/10/2026 08:12 16:34 » dans une seule cellule : on découpe par espaces
    const tokens = raw.split(/[\s,;|]+/).map(t => t.replace(/^["'(]+|["')]+$/g, '')).filter(Boolean);
    let date: string | null = null;
    const times: string[] = [];
    tokens.forEach(t => {
      const d = readDate(t);
      if (d) { if (!date) date = d; return; }
      const h = readTime(t);
      if (h) times.push(h);
    });
    if (date && !times.length) { contextDate = date; out.ignored++; return; }
    if (!times.length) { out.ignored++; return; }
    const day = date ?? contextDate;
    if (!day) { out.unknown.push({ line: idx + 1, raw, hint: 'Date introuvable sur la ligne et dans le titre du document' }); return; }

    // 1. Matricule écrit en clair
    let emp: Employee | undefined;
    let matchedBy: ReadPunchRow['matchedBy'] = 'matricule';
    for (const t of tokens) {
      const m = fixMatricule(t);
      emp = employees.find(e => e.matricule.toUpperCase() === m);
      if (emp) break;
    }
    // 2. ID pointeuse : première valeur entièrement numérique de la ligne (colonne AC-No., No., ID…)
    if (!emp) {
      const idTok = tokens.find(t => /^\d{1,9}$/.test(t));
      if (idTok) {
        const id = normalizeUserId(idTok);
        emp = employees.find(e => normalizeUserId(e.zktecoBioId) === id);
        matchedBy = 'id';
        // Un ID et un nom qui désignent deux personnes différentes : le nom l'emporte (ID mal lu)
        const byName = findByName(raw, employees);
        if (byName && emp && byName.id !== emp.id) { emp = byName; matchedBy = 'nom'; }
      }
    }
    // 3. Nom et postnom / prénom
    if (!emp) { const byName = findByName(raw, employees); if (byName) { emp = byName; matchedBy = 'nom'; } }

    if (!emp) { out.unknown.push({ line: idx + 1, raw, hint: 'Aucun agent reconnu (matricule, ID pointeuse ou nom)' }); return; }
    out.rows.push({ line: idx + 1, raw, date: day, times, emp, matchedBy });
  });
  return out;
}

/** Une journée par agent : premier pointage = entrée ; dernier = sortie s'il vient au moins 30 min après */
export interface DayAttendance { emp: Employee; date: string; checkIn: string; checkOut: string | null; punches: string[]; matchedBy: ReadPunchRow['matchedBy']; lines: number[] }
export function groupByDay(rows: ReadPunchRow[]): DayAttendance[] {
  const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const groups = new Map<string, DayAttendance>();
  rows.forEach(r => {
    const key = `${r.emp.matricule}|${r.date}`;
    const g = groups.get(key) || { emp: r.emp, date: r.date, checkIn: '', checkOut: null, punches: [], matchedBy: r.matchedBy, lines: [] };
    g.punches.push(...r.times);
    g.lines.push(r.line);
    groups.set(key, g);
  });
  return [...groups.values()].map(g => {
    const punches = [...new Set(g.punches)].sort();
    const first = punches[0], last = punches[punches.length - 1];
    return { ...g, punches, checkIn: first, checkOut: punches.length > 1 && toMin(last) - toMin(first) >= 30 ? last : null };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.emp.matricule.localeCompare(b.emp.matricule));
}

/** Texte brut (AttLog, CSV, TXT) → lignes de cellules */
export const textToRows = (text: string): string[][] => text.split(/\r?\n/).map(l => [l]);
