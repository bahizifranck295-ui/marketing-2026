// Lecture des fichiers de pointage exportés sur clé USB par les pointeuses ZKTeco
// (F18, F19, uFace…) : AttLog.dat / .txt (tabulations, lignes précédées d'espaces),
// .csv, ou une liste convertie depuis Excel. Chaque ligne donne un identifiant,
// une date et une heure ; les colonnes suivantes (mode de vérification, entrée/sortie…) sont ignorées.

export interface RawPunch {
  line: number;
  userId: string;
  date: string; // AAAA-MM-JJ
  time: string; // HH:MM
}

const pad = (n: number | string) => String(n).padStart(2, '0');

/** Date au format AAAA-MM-JJ, à partir de AAAA-MM-JJ, AAAA/MM/JJ, JJ/MM/AAAA ou JJ-MM-AAAA */
function readDate(token: string): string | null {
  let m = token.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = token.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return null;
}

/** Heure au format HH:MM, à partir de H:MM ou HH:MM:SS */
function readTime(token: string): string | null {
  const m = token.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${pad(m[1])}:${m[2]}`;
}

/** Identifiant de pointeuse sans zéros de tête (« 0007 » et « 7 » désignent la même personne) */
export const normalizeUserId = (id: string) => id.trim().replace(/^0+(?=\d)/, '');

export function parseZKTecoText(text: string): { punches: RawPunch[]; ignored: number[] } {
  const punches: RawPunch[] = [];
  const ignored: number[] = [];
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const tokens = line.split(/[\t,;]+|\s+/).map(t => t.trim().replace(/^"|"$/g, '')).filter(Boolean);
    let date: string | null = null;
    let time: string | null = null;
    let dateIdx = -1;
    tokens.forEach((t, i) => {
      if (!date) { const d = readDate(t); if (d) { date = d; dateIdx = i; return; } }
      if (!time) { const h = readTime(t); if (h) time = h; }
    });
    // L'identifiant est la première valeur avant la date (en général la première colonne)
    const userId = tokens.slice(0, dateIdx > 0 ? dateIdx : 1).find(t => /^[A-Za-z0-9-]+$/.test(t) && !readDate(t) && !readTime(t));
    if (!date || !time || !userId) { ignored.push(idx + 1); return; }
    punches.push({ line: idx + 1, userId, date, time });
  });
  return { punches, ignored };
}
