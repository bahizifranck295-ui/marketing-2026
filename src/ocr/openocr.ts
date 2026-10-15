// OCR OpenOCR (Topdu/OpenOCR, licence Apache-2.0) exécuté dans le navigateur, sans serveur.
// Mêmes modèles ONNX que le paquet Python (openocr_det_model.onnx et openocr_rec_model.onnx),
// mêmes prétraitements que ses fichiers de configuration :
//   détection  : configs/det/dbnet/repvit_db.yml (DetResizeForTest 960, NormalizeImage BGR, DBPostProcess)
//   lecture    : configs/rec/svtrv2/repsvtr_ch.yml (RecDynamicResize 48×320, CTCLabelDecode, ppocr_keys_v1)
// Les fichiers sont servis depuis public/ocr et public/ort ; le modèle de lecture est découpé en deux
// morceaux pour respecter la taille maximale d'un fichier publié, puis recollé ici (voir ocr/manifest.json).
import * as ort from 'onnxruntime-web/wasm';

export interface OcrBox { x: number; y: number; w: number; h: number; text: string; score: number }
export type OcrProgress = (message: string) => void;

// Adresse absolue : les modules chargés dynamiquement résolvent les chemins relatifs depuis assets/
const BASE = new URL(import.meta.env.BASE_URL, document.baseURI).href;
let engine: Promise<{ det: ort.InferenceSession; rec: ort.InferenceSession; chars: string[] }> | null = null;

async function fetchBytes(path: string): Promise<Uint8Array> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`Fichier du moteur OCR introuvable : ${path}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Morceau publié en texte base64 (hébergements qui ne servent pas les fichiers binaires .onnx) */
async function fetchBase64(path: string): Promise<Uint8Array> {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`Fichier du moteur OCR introuvable : ${path}`);
  const bin = atob((await r.text()).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Un modèle peut être découpé en plusieurs morceaux, binaires ou base64 ; ocr/manifest.json les liste :
 * { "encoding": "raw" | "base64", "det": ["det.onnx"], "rec": ["rec.onnx.part0", "rec.onnx.part1"] }
 */
async function fetchModel(files: string[], encoding: 'raw' | 'base64'): Promise<Uint8Array> {
  const parts = await Promise.all(files.map(f => (encoding === 'base64' ? fetchBase64 : fetchBytes)(`ocr/${f}`)));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  parts.forEach(p => { out.set(p, at); at += p.length; });
  return out;
}

/** Charge le moteur une seule fois (≈ 49 Mo, gardés ensuite en cache par le navigateur) */
function loadEngine(progress?: OcrProgress) {
  if (!engine) {
    engine = (async () => {
      // Binaire WebAssembly et son module de chargement, servis depuis public/ort (en développement,
      // Vite sert le module depuis node_modules : seul le binaire est indiqué)
      ort.env.wasm.wasmPaths = import.meta.env.PROD
        ? { wasm: `${BASE}ort/ort-wasm-simd-threaded.wasm`, mjs: `${BASE}ort/ort-wasm-simd-threaded.mjs` }
        : { wasm: `${BASE}ort/ort-wasm-simd-threaded.wasm` };
      ort.env.wasm.numThreads = 1;
      progress?.('Chargement du moteur OpenOCR (une seule fois)…');
      const manifest: { encoding: 'raw' | 'base64'; det: string[]; rec: string[] } = await fetch(`${BASE}ocr/manifest.json`).then(r => r.json());
      const [det, recBytes, keys] = await Promise.all([
        fetchModel(manifest.det, manifest.encoding), fetchModel(manifest.rec, manifest.encoding),
        fetch(`${BASE}ocr/keys.txt`).then(r => r.text()),
      ]);
      const opts: ort.InferenceSession.SessionOptions = { executionProviders: ['wasm'] };
      const [detS, recS] = await Promise.all([ort.InferenceSession.create(det, opts), ort.InferenceSession.create(recBytes, opts)]);
      // CTCLabelDecode : index 0 = blanc, puis le dictionnaire, puis l'espace (use_space_char)
      const chars = ['', ...keys.replace(/\r/g, '').split('\n').filter((_, i, a) => i < a.length - 1 || a[i] !== ''), ' '];
      return { det: detS, rec: recS, chars };
    })();
    engine.catch(() => { engine = null; });
  }
  return engine;
}

function pixels(src: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number) {
  const c = document.createElement('canvas');
  c.width = dw; c.height = dh;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, dw, dh);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh);
  return ctx.getImageData(0, 0, dw, dh).data;
}

/** Zones de texte (DBNet) : carte de probabilité → composantes connexes → rectangles élargis (unclip 1,5) */
async function detect(det: ort.InferenceSession, img: HTMLCanvasElement): Promise<{ x: number; y: number; w: number; h: number }[]> {
  const W = img.width, H = img.height;
  const ratio = Math.max(W, H) > 960 ? 960 / Math.max(W, H) : 1;
  const rw = Math.max(32, Math.round((W * ratio) / 32) * 32);
  const rh = Math.max(32, Math.round((H * ratio) / 32) * 32);
  const px = pixels(img, 0, 0, W, H, rw, rh);
  const n = rw * rh;
  const data = new Float32Array(3 * n);
  // Image lue en BGR, moyennes et écarts types appliqués dans cet ordre (comme NormalizeImage d'OpenOCR)
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let i = 0; i < n; i++) {
    const b = px[i * 4 + 2], g = px[i * 4 + 1], r = px[i * 4];
    data[i] = (b / 255 - mean[0]) / std[0];
    data[n + i] = (g / 255 - mean[1]) / std[1];
    data[2 * n + i] = (r / 255 - mean[2]) / std[2];
  }
  const out = await det.run({ [det.inputNames[0]]: new ort.Tensor('float32', data, [1, 3, rh, rw]) });
  const prob = out[det.outputNames[0]].data as Float32Array;

  const seen = new Uint8Array(n);
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < n; start++) {
    if (seen[start] || prob[start] <= 0.3) continue;
    let minX = rw, minY = rh, maxX = 0, maxY = 0, sum = 0, count = 0;
    stack.push(start); seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % rw, y = (p - x) / rw;
      sum += prob[p]; count++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const nb = [x > 0 ? p - 1 : -1, x < rw - 1 ? p + 1 : -1, y > 0 ? p - rw : -1, y < rh - 1 ? p + rw : -1];
      for (const q of nb) if (q >= 0 && !seen[q] && prob[q] > 0.3) { seen[q] = 1; stack.push(q); }
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    if (Math.min(w, h) < 3 || sum / count < 0.6) continue;
    // Élargissement : distance = aire × 1,5 / périmètre (DBPostProcess.unclip)
    const d = (w * h * 1.5) / (2 * (w + h));
    const x0 = Math.max(0, minX - d), y0 = Math.max(0, minY - d);
    const x1 = Math.min(rw, maxX + 1 + d), y1 = Math.min(rh, maxY + 1 + d);
    const sx = W / rw, sy = H / rh;
    boxes.push({ x: x0 * sx, y: y0 * sy, w: (x1 - x0) * sx, h: (y1 - y0) * sy });
  }
  return boxes;
}

/** Lecture de chaque zone (SVTR, CTC) : hauteur 48 px, largeur proportionnelle, au moins 320 px */
async function recognize(rec: ort.InferenceSession, chars: string[], img: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }) {
  const H = 48;
  const ratio = box.w / box.h;
  const fullW = Math.floor(H * Math.max(ratio, 320 / 48));
  const rw = Math.min(fullW, Math.ceil(H * ratio));
  const px = pixels(img, box.x, box.y, box.w, box.h, rw, H);
  const n = H * fullW;
  const data = new Float32Array(3 * n); // le reste de la largeur reste à 0 (rembourrage)
  for (let y = 0; y < H; y++) for (let x = 0; x < rw; x++) {
    const i = (y * rw + x) * 4, o = y * fullW + x;
    data[o] = px[i + 2] / 127.5 - 1;
    data[n + o] = px[i + 1] / 127.5 - 1;
    data[2 * n + o] = px[i] / 127.5 - 1;
  }
  const out = await rec.run({ [rec.inputNames[0]]: new ort.Tensor('float32', data, [1, 3, H, fullW]) });
  const t = out[rec.outputNames[0]];
  const [, steps, classes] = t.dims as number[];
  const pr = t.data as Float32Array;
  let text = '', prev = -1, total = 0, kept = 0;
  for (let s = 0; s < steps; s++) {
    let best = 0, bestP = -Infinity;
    for (let c = 0; c < classes; c++) { const v = pr[s * classes + c]; if (v > bestP) { bestP = v; best = c; } }
    if (best !== 0 && best !== prev) { text += chars[best] ?? ''; total += bestP; kept++; }
    prev = best;
  }
  return { text: text.trim(), score: kept ? total / kept : 0 };
}

/** Texte de l'image, zone par zone, avec la position de chaque zone */
export async function runOcr(img: HTMLCanvasElement, progress?: OcrProgress): Promise<OcrBox[]> {
  const { det, rec, chars } = await loadEngine(progress);
  progress?.('Détection des zones de texte…');
  const boxes = await detect(det, img);
  const result: OcrBox[] = [];
  for (let i = 0; i < boxes.length; i++) {
    if (i % 5 === 0) progress?.(`Lecture du texte : ${i + 1} / ${boxes.length}`);
    const r = await recognize(rec, chars, img, boxes[i]);
    if (r.text && r.score > 0.5) result.push({ ...boxes[i], ...r });
  }
  return result;
}

/**
 * Regroupe les zones en lignes du document ; un grand écart horizontal sépare deux colonnes.
 * Les zones sont parcourues de gauche à droite et chaque zone rejoint la ligne dont la dernière zone
 * la chevauche le plus en hauteur : une photo un peu penchée garde ainsi ses lignes entières.
 */
export function boxesToRows(boxes: OcrBox[]): string[][] {
  const lines: OcrBox[][] = [];
  [...boxes].sort((a, b) => a.x - b.x).forEach(b => {
    let best: OcrBox[] | null = null, bestOverlap = 0;
    lines.forEach(l => {
      const last = l[l.length - 1];
      if (last.x + last.w > b.x + b.w / 2) return; // cette ligne a déjà une zone à cet endroit
      const overlap = (Math.min(last.y + last.h, b.y + b.h) - Math.max(last.y, b.y)) / Math.min(last.h, b.h);
      if (overlap > 0.4 && overlap > bestOverlap) { best = l; bestOverlap = overlap; }
    });
    if (best) (best as OcrBox[]).push(b); else lines.push([b]);
  });
  return lines
    .sort((a, b) => (a[0].y + a[0].h / 2) - (b[0].y + b[0].h / 2))
    .map(l => {
      const cells: string[] = [];
      l.forEach((b, i) => {
        const prev = l[i - 1];
        if (prev && b.x - (prev.x + prev.w) < 0.6 * b.h) cells[cells.length - 1] += ` ${b.text}`;
        else cells.push(b.text);
      });
      return cells;
    });
}

/** Image (photo, capture) ou PDF → canevas, une page à la fois */
export async function fileToCanvases(file: File): Promise<HTMLCanvasElement[]> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages: HTMLCanvasElement[] = [];
    for (let p = 1; p <= Math.min(pdf.numPages, 10); p++) {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport: vp }).promise;
      pages.push(c);
    }
    return pages;
  }
  const bmp = await createImageBitmap(file);
  // Les très grandes photos sont réduites (le texte reste lisible, la lecture est plus rapide)
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return [c];
}
