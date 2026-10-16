// Lecture d'un relevé de pointage, quelle que soit sa forme : fichier AttLog de la clé USB, liste CSV,
// classeur Excel ou texte lu par l'OCR sur une photo ou un PDF du rapport de la pointeuse.
//
// Règle de fidélité : la pointeuse est la seule source fiable. Rien n'est inventé ni écarté en silence :
// chaque ligne du document finit dans l'une de trois listes — pointages lus, lignes à vérifier (avec la raison),
// lignes sans pointage (titres, en-têtes) — et le total est toujours affiché.
import type { Employee } from '../types';

export interface ReadPunchRow {
  line: number;
  raw: string;
  date: string;     // AAAA-MM-JJ
  times: string[];  // HH:MM, dans l'ordre du document
  emp: Employee;
  matchedBy: 'matricule' | 'id' | 'nom';
  /** Confiance de la lecture OCR (0 à 1) ; absente pour un fichier lu directement */
  confidence?: number;
}
export interface ReadResult {
  rows: ReadPunchRow[];
  /** Lignes avec une heure mais impossibles à rattacher avec certitude (à vérifier, non importées) */
  unknown: { line: number; raw: string; hint: string }[];
  /** Lignes sans aucune heure : titres, en-têtes, lignes vides de pointage */
  ignored: { line: number; raw: string }[];
  /** Nombre de lignes non vides lues dans le document */
  totalLines: number;
}
export interface ReadOptions {
  /** Texte issu de l'OCR : tolère « 08.12 » et les confusions O/0, I/1 dans les matricules */
  ocr?: boolean;
  /** Confiance OCR de chaque ligne (même ordre que `rows`) */
  confidences?: number[];
}

const pad = (n: number | string) => String(n).padStart(2, '0');

/** Identifiant de pointeuse sans zéros de tête (« 0007 » et « 7 » désignent la même personne) */
export const normalizeUserId = (id: string) => id.trim().replace(/^0+(?=\d)/, '');

/** Date AAAA-MM-JJ à partir de AAAA-MM-JJ, AAAA/MM/JJ, JJ/MM/AAAA, JJ-MM-AAAA ou JJ.MM.AAAA ; refuse une date impossible */
export function readDate(token: string): string | null {
  let m = token.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let y: string, mo: string, d: string;
  if (m) [, y, mo, d] = m;
  else if ((m = token.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [, d, mo, y] = m;
  else return null;
  // Format américain MM/JJ/AAAA reconnu quand le « mois » dépasse 12
  if (+mo > 12 && +d <= 12) [mo, d] = [d, mo];
  if (+mo < 1 || +mo > 12 || +d < 1) return null;
  // Jour réellement présent dans ce mois (le 31/02 est refusé)
  const daysInMonth = new Date(Date.UTC(+y, +mo, 0)).getUTCDate();
  if (+d > daysInMonth) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/**
 * Heure HH:MM à partir de H:MM, HH:MM:SS ou 08h12. Le point (« 08.12 ») n'est accepté que pour l'OCR,
 * qui confond parfois « : » et « . » ; dans un fichier, « 12.50 » est un nombre, pas une heure.
 */
export function readTime(token: string, ocr = false): string | null {
  const m = ocr
    ? token.match(/^(\d{1,2})[:hH.](\d{2})(?:[:.]\d{2})?$/)
    : token.match(/^(\d{1,2})[:hH](\d{2})(?::\d{2})?$/);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return `${pad(m[1])}:${m[2]}`;
}

/** Majuscules sans accents ni ponctuation, pour comparer des noms */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

/** OCR uniquement : confusions O/0 et I/1 dans un matricule (« PRM-OO1 » → « PRM-001 ») */
const fixMatricule = (s: string) => s.toUpperCase().replace(/^([A-Z]+)[-_ ]?([0-9OIL]+)$/, (_, p, n) => `${p}-${n.replace(/O/g, '0').replace(/[IL]/g, '1')}`);

/** Employé désigné sans ambiguïté par au moins deux parties de son nom (nom, postnom, prénom) */
function findByName(text: string, employees: Employee[], ocr: boolean): Employee | null {
  const words = new Set(plain(text).split(' '));
  const glued = plain(text).replace(/ /g, '');
  let best: Employee | null = null, bestScore = 0, tie = false;
  employees.forEach(e => {
    const parts = [e.nom, e.postnom, e.prenom].map(plain).filter(p => p.length >= 3);
    // L'OCR perd parfois l'espace entre deux noms : on accepte alors un nom collé à un autre
    const score = parts.filter(p => words.has(p) || (ocr && p.length >= 4 && glued.includes(p))).length;
    if (score > bestScore) { best = e; bestScore = score; tie = false; }
    else if (score === bestScore && score > 0) tie = true;
  });
  return bestScore >= 2 && !tie ? best : null;
}

/**
 * @param rows lignes du document, déjà découpées en cellules
 * @param employees registre du personnel
 */
export function readAttendanceRows(rows: string[][], employees: Employee[], options: ReadOptions = {}): ReadResult {
  const { ocr = false, confidences } = options;
  const out: ReadResult = { rows: [], unknown: [], ignored: [], totalLines: 0 };
  let contextDate: string | null = null; // date d'un titre (« Rapport du 11/10/2026 ») pour les lignes qui n'en ont pas

  rows.forEach((cells, idx) => {
    const raw = cells.map(c => String(c ?? '').trim()).filter(Boolean).join('  ');
    if (!raw) return;
    out.totalLines++;
    const line = idx + 1;
    // « 2026-10-11 08:12:15 » ou « 11/10/2026 08:12 16:34 » dans une seule cellule : on découpe par espaces
    const tokens = raw.split(/[\s,;|]+/).map(t => t.replace(/^["'(]+|["')]+$/g, '')).filter(Boolean);
    let date: string | null = null;
    let badDate = false;
    const times: string[] = [];
    tokens.forEach(t => {
      const d = readDate(t);
      if (d) { if (!date) date = d; return; }
      const h = readTime(t, ocr);
      if (h) { times.push(h); return; }
      // Ressemble à une date mais n'existe pas au calendrier (ex. 31/02/2026)
      if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(t)) badDate = true;
    });
    if (!times.length) {
      if (date) contextDate = date;
      out.ignored.push({ line, raw });
      return;
    }
    if (badDate && !date) { out.unknown.push({ line, raw, hint: 'Date impossible (jour absent du calendrier)' }); return; }
    const day = date ?? contextDate;
    if (!day) { out.unknown.push({ line, raw, hint: 'Date introuvable sur la ligne et dans le titre du document' }); return; }

    // 1. Matricule écrit en clair
    let emp: Employee | undefined;
    let matchedBy: ReadPunchRow['matchedBy'] = 'matricule';
    for (const t of tokens) {
      const m = ocr ? fixMatricule(t) : t.toUpperCase();
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
        // Un ID et un nom qui désignent deux personnes différentes : on ne choisit pas à la place de la pointeuse
        const byName = findByName(raw, employees, ocr);
        if (byName && emp && byName.id !== emp.id) {
          out.unknown.push({ line, raw, hint: `ID pointeuse ${idTok} = ${emp.nom} ${emp.prenom}, mais le nom lu est ${byName.nom} ${byName.prenom}` });
          return;
        }
      }
    }
    // 3. Nom et postnom / prénom
    if (!emp) { const byName = findByName(raw, employees, ocr); if (byName) { emp = byName; matchedBy = 'nom'; } }

    if (!emp) { out.unknown.push({ line, raw, hint: 'Aucun agent reconnu (matricule, ID pointeuse ou nom)' }); return; }
    out.rows.push({ line, raw, date: day, times, emp, matchedBy, confidence: confidences?.[idx] });
  });
  return out;
}

/** Une journée par agent : premier pointage = entrée ; dernier = sortie s'il vient au moins 30 min après */
export interface DayAttendance {
  emp: Employee;
  date: string;
  checkIn: string;
  checkOut: string | null;
  /** Tous les pointages lus pour ce jour, triés (aucun n'est retiré) */
  punches: string[];
  /** Pointages exactement identiques lus plusieurs fois (même heure) */
  duplicates: number;
  matchedBy: ReadPunchRow['matchedBy'];
  lines: number[];
  /** Confiance OCR la plus basse des lignes de ce jour (fichier lu directement : absente) */
  confidence?: number;
}
export function groupByDay(rows: ReadPunchRow[]): DayAttendance[] {
  const toMin = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const groups = new Map<string, DayAttendance & { all: string[] }>();
  rows.forEach(r => {
    const key = `${r.emp.matricule}|${r.date}`;
    const g = groups.get(key) || { emp: r.emp, date: r.date, checkIn: '', checkOut: null, punches: [], all: [], duplicates: 0, matchedBy: r.matchedBy, lines: [] };
    g.all.push(...r.times);
    g.lines.push(r.line);
    if (r.confidence !== undefined) g.confidence = Math.min(g.confidence ?? 1, r.confidence);
    groups.set(key, g);
  });
  return [...groups.values()].map(({ all, ...g }) => {
    const punches = [...new Set(all)].sort();
    const first = punches[0], last = punches[punches.length - 1];
    return { ...g, punches, duplicates: all.length - punches.length, checkIn: first, checkOut: punches.length > 1 && toMin(last) - toMin(first) >= 30 ? last : null };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.emp.matricule.localeCompare(b.emp.matricule));
}

/** Texte brut (AttLog, CSV, TXT) → lignes de cellules */
export const textToRows = (text: string): string[][] => text.split(/\r?\n/).map(l => [l]);

/**
 * Fichier texte de la clé USB décodé selon son encodage réel : UTF-8 (cas courant), UTF-16 (certaines
 * exportations Windows, reconnues par leur marque d'ordre des octets) ou Windows-1252 (accents « é » en un octet).
 */
export function decodeText(buffer: ArrayBuffer): string {
  const b = new Uint8Array(buffer);
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? b.subarray(3) : b);
  } catch {
    return new TextDecoder('windows-1252').decode(b);
  }
}

/**
 * Absences déduites (elles ne figurent pas dans le fichier : c'est l'absence de pointage qui les établit).
 * Uniquement pour les jours présents dans le fichier, les jours ouvrés de l'entreprise, les agents actifs
 * sans aucun pointage lu ce jour-là et sans ligne déjà enregistrée au carnet.
 * @param workingDays jours ouvrés, 1 = lundi … 7 = dimanche
 */
export function absentCandidates(
  days: DayAttendance[],
  employees: Employee[],
  existingKeys: Set<string>,
  workingDays: number[],
): { date: string; emp: Employee }[] {
  const dates = [...new Set(days.map(d => d.date))].sort();
  const present = new Set(days.map(d => `${d.emp.matricule}|${d.date}`));
  const out: { date: string; emp: Employee }[] = [];
  dates.forEach(date => {
    const weekday = new Date(`${date}T12:00:00`).getDay() || 7;
    if (workingDays.length && !workingDays.includes(weekday)) return;
    employees
      .filter(e => e.statutAdministratif === 'ACTIF' && !present.has(`${e.matricule}|${date}`) && !existingKeys.has(`${e.matricule}|${date}`))
      .forEach(emp => out.push({ date, emp }));
  });
  return out;
}
