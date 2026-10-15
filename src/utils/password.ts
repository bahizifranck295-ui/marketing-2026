// Mots de passe des comptes : seule une empreinte SHA-256 est enregistrée, jamais le mot de passe lui-même.
// L'adresse e-mail sert de sel : deux comptes avec le même mot de passe n'ont pas la même empreinte.

/** Mot de passe des comptes qui n'en ont pas encore reçu (à changer dans Paramètres › Utilisateurs & Rôles) */
export const INITIAL_PASSWORD = 'admin123';

export async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkPassword(user: { email: string; passwordHash?: string }, password: string): Promise<boolean> {
  if (!user.passwordHash) return password === INITIAL_PASSWORD;
  return (await hashPassword(user.email, password)) === user.passwordHash;
}
