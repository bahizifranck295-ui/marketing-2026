/*
 * Logo officiel PREMIDIS S.A.R.L. — source unique pour toute l'application.
 * Le fichier public/assets/premidis-logo.png est l'image officielle fournie, copiée sans aucune
 * modification (ni recadrage, ni couleur, ni redimensionnement). Partout — écrans, modes clair et sombre,
 * factures, reçus, rapports et PDF — le logo est affiché depuis ce fichier, seulement mis à l'échelle
 * en conservant ses proportions.
 */
export const LOGO_SRC = `${import.meta.env.BASE_URL}assets/premidis-logo.png`;
export const LOGO_ALT = "PREMIDIS S.A.R.L.";
/**
 * Même image officielle avec le fond blanc retiré (couleurs inchangées), utilisée uniquement pendant
 * l'assemblage des anneaux de l'introduction en mode sombre.
 */
export const LOGO_TRANSPARENT_SRC = `${import.meta.env.BASE_URL}assets/premidis-logo-transparent.png`;
