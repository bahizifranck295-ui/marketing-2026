// Accès au stockage du navigateur sans jamais faire tomber l'application :
// - une donnée illisible est mise de côté (copie « __illisible ») et remplacée par la valeur par défaut ;
// - un stockage plein n'interrompt pas l'écran : l'incident est signalé à l'utilisateur.

export type StorageIssue = { kind: 'corrupted' | 'full' | 'unavailable'; key: string; at: string };

type Listener = (issue: StorageIssue) => void;
const listeners = new Set<Listener>();
const pending: StorageIssue[] = [];

function report(kind: StorageIssue['kind'], key: string) {
  const issue = { kind, key, at: new Date().toISOString() };
  if (listeners.size === 0) pending.push(issue);
  listeners.forEach(l => l(issue));
}

/** Reçoit les incidents de stockage (y compris ceux survenus avant l'abonnement) */
export function onStorageIssue(listener: Listener): () => void {
  listeners.add(listener);
  pending.splice(0).forEach(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Lit une valeur JSON. Clé absente → `fallback` (premier démarrage).
 * Contenu illisible → copie conservée, puis `whenCorrupted` (par défaut `fallback`) : pour les données de
 * l'entreprise on repart d'une liste vide plutôt que de réinjecter des données de démonstration.
 */
export function loadJSON<T>(key: string, fallback: () => T, whenCorrupted: () => T = fallback): T {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    report('unavailable', key);
    return fallback();
  }
  if (raw === null) return fallback();
  try {
    return JSON.parse(raw) as T;
  } catch {
    try { localStorage.setItem(`${key}__illisible`, raw); } catch { /* copie impossible : stockage plein */ }
    report('corrupted', key);
    return whenCorrupted();
  }
}

/** Écrit une valeur JSON ; renvoie false (et signale l'incident) si le stockage est plein ou indisponible */
export function saveJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    const full = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    report(full ? 'full' : 'unavailable', key);
    return false;
  }
}

/** Toutes les données de l'application (clés « premidis_ »), pour une sauvegarde */
export function readAllAppData(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('premidis_')) out[k] = localStorage.getItem(k) ?? '';
    }
  } catch { /* stockage indisponible */ }
  return out;
}

/** Télécharge un fichier texte créé dans le navigateur */
export function downloadText(fileName: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
