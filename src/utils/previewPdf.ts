import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';

/**
 * PDF identique à l'aperçu affiché : le document à l'écran (en-tête PREMIDIS SARL, titre, bilan,
 * tableau…) est photographié tel quel puis réparti sur des pages A4 paysage. Les pages sont coupées
 * entre deux lignes du tableau, jamais au milieu d'une ligne.
 */
export async function exportPreviewToPdf(el: HTMLElement, fileName: string): Promise<void> {
  const root = document.documentElement;
  const previousTheme = root.getAttribute('data-theme');
  // Le document officiel est toujours exporté sur fond blanc, même si l'écran est en mode sombre
  root.setAttribute('data-theme', 'light');
  // Les tableaux larges défilent à l'écran : pour l'export, tout leur contenu doit être visible
  const scrollers = Array.from(el.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-auto'));
  const saved = scrollers.map(s => s.style.overflow);
  scrollers.forEach(s => { s.style.overflow = 'visible'; });
  const savedWidth = el.style.width;
  const fullWidth = Math.max(el.scrollWidth, ...scrollers.map(s => s.scrollWidth + 64));
  if (fullWidth > el.clientWidth) el.style.width = `${fullWidth}px`;

  try {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const box = el.getBoundingClientRect();
    // Endroits où une page peut se terminer : bas de chaque ligne de tableau et de chaque bloc
    const cuts = Array.from(el.querySelectorAll('tr, :scope > *'))
      .map(n => n.getBoundingClientRect().bottom - box.top)
      .filter(y => y > 0)
      .sort((a, b) => a - b);

    const canvas = await toCanvas(el, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      width: el.scrollWidth,
      height: el.scrollHeight,
      style: { boxShadow: 'none', borderRadius: '0' },
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 8;
    const footer = 6;
    const ratio = canvas.width / el.scrollWidth; // pixels du canevas par pixel CSS
    const mmPerCss = (pageW - 2 * margin) / el.scrollWidth;
    const pageCss = (pageH - 2 * margin - footer) / mmPerCss; // hauteur utile d'une page, en pixels CSS
    const total = el.scrollHeight;

    const slices: [number, number][] = [];
    let start = 0;
    while (start < total - 1) {
      let end = Math.min(total, start + pageCss);
      if (end < total) {
        const best = cuts.filter(c => c > start + 40 && c <= end).pop();
        if (best) end = best;
      }
      slices.push([start, end]);
      start = end;
    }

    slices.forEach(([y0, y1], i) => {
      if (i > 0) doc.addPage();
      const part = document.createElement('canvas');
      part.width = canvas.width;
      part.height = Math.ceil((y1 - y0) * ratio);
      const ctx = part.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, part.width, part.height);
      ctx.drawImage(canvas, 0, Math.floor(y0 * ratio), canvas.width, part.height, 0, 0, canvas.width, part.height);
      doc.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, pageW - 2 * margin, (y1 - y0) * mmPerCss);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`PREMIDIS SARL – Document officiel · Page ${i + 1} sur ${slices.length}`, pageW / 2, pageH - margin / 2 - 1, { align: 'center' });
    });

    // Nom de fichier sans accents ni symboles, accepté par tous les navigateurs
    const safeName = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    doc.save(`${safeName}_${new Date().toISOString().substring(0, 10)}.pdf`);
  } finally {
    scrollers.forEach((s, i) => { s.style.overflow = saved[i]; });
    el.style.width = savedWidth;
    if (previousTheme === null) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', previousTheme);
  }
}
