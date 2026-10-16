import type jsPDF from 'jspdf';
import { LETTERHEAD_LOGO } from '../assets/letterheadLogo';

// En-tête officiel PREMIDIS SARL, reproduit en texte vectoriel.
// Les coordonnées viennent de la maquette d'origine (1080 × 360 px) :
// le bandeau bleu va de x=28 à x=1052, le bloc complet de y=90 à y=280.
export const LETTERHEAD_TEXT = {
  title: 'PREMIDIS SARL',
  commune: 'COMMUNE DE KARISIMBI, GOMA, DRCONGO',
  address: 'Route Aéroport N°20, QBUJOVU, C/ de KARISIMBI, Ville de GOMA, Prov, du Nord-Kivu en R.D.Congo',
  rccm: 'N R.C.C.M du siège.  CD/GOM/RCCM/14-B-0203',
};

const BAND_BLUE: [number, number, number] = [1, 58, 198];
const TITLE_BLUE: [number, number, number] = [16, 40, 190];
const CYAN: [number, number, number] = [106, 232, 255];

const SRC_LEFT = 28;
const SRC_TOP = 90;
const SRC_WIDTH = 1024;

/**
 * Dessine l'en-tête PREMIDIS SARL en haut de la page courante.
 * Retourne l'ordonnée (mm) juste sous l'en-tête.
 */
export const drawLetterhead = (doc: jsPDF, top = 8): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = Math.min(pageWidth - 28, 210);
  const k = width / SRC_WIDTH; // mm par pixel de la maquette
  const x0 = (pageWidth - width) / 2;
  const X = (px: number) => x0 + (px - SRC_LEFT) * k;
  const Y = (px: number) => top + (px - SRC_TOP) * k;

  // Texte centré, mis à la taille qui remplit la largeur de la maquette
  const fitText = (
    text: string,
    font: string,
    style: string,
    leftPx: number,
    rightPx: number,
    baselinePx: number,
    color: [number, number, number]
  ) => {
    doc.setFont(font, style);
    doc.setFontSize(10);
    const target = (rightPx - leftPx) * k;
    const size = (10 * target) / doc.getTextWidth(text);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, X((leftPx + rightPx) / 2), Y(baselinePx), { align: 'center' });
  };

  // Logos (anneaux) à gauche et à droite
  doc.addImage(LETTERHEAD_LOGO, 'JPEG', X(109), Y(90), 98 * k, 80 * k);
  doc.addImage(LETTERHEAD_LOGO, 'JPEG', X(873), Y(90), 98 * k, 80 * k);

  // PREMIDIS SARL
  fitText(LETTERHEAD_TEXT.title, 'times', 'bold', 228, 856, 160, TITLE_BLUE);

  // Bandeau bleu
  doc.setFillColor(BAND_BLUE[0], BAND_BLUE[1], BAND_BLUE[2]);
  doc.rect(X(28), Y(174), 1024 * k, 106 * k, 'F');

  fitText(LETTERHEAD_TEXT.commune, 'times', 'bold', 247, 839, 203, [255, 255, 255]);

  // Filet cyan
  doc.setFillColor(CYAN[0], CYAN[1], CYAN[2]);
  doc.roundedRect(X(138), Y(212), 803 * k, 10 * k, 5 * k, 5 * k, 'F');

  fitText(LETTERHEAD_TEXT.address, 'helvetica', 'normal', 159, 921, 248, [255, 255, 255]);
  fitText(LETTERHEAD_TEXT.rccm, 'helvetica', 'normal', 344, 734, 269, [255, 255, 255]);

  doc.setTextColor(20, 35, 59);
  return Y(280);
};
