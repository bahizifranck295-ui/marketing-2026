import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import { readAttendanceRows, groupByDay, textToRows, decodeText, absentCandidates, type DayAttendance, type ReadResult } from '../../utils/attendanceReader';
import { Upload, CheckCircle2, AlertTriangle, ScanText, X, Loader2, ArrowRight } from 'lucide-react';

type Method = 'texte' | 'excel' | 'ocr';
interface Preview {
  fileName: string;
  method: Method;
  days: DayAttendance[];
  unknown: ReadResult['unknown'];
  ignored: ReadResult['ignored'];
  totalLines: number;
  /** Journées retirées à la main par l'opérateur dans l'aperçu */
  removed: number;
  rawText: string;
}

/** En dessous de ce seuil, une lecture OCR est signalée « à vérifier » */
const OCR_SURE = 0.85;

const METHOD_LABEL: Record<Method, string> = {
  texte: 'Fichier de la clé USB lu directement',
  excel: 'Classeur Excel lu directement',
  ocr: 'Document lu par OpenOCR',
};
const MATCH_LABEL = { matricule: 'Matricule', id: 'ID pointeuse', nom: 'Nom' } as const;

// Même forme que le fichier AttLog écrit sur la clé USB par la pointeuse (identifiant aligné à droite)
const SAMPLE = `        1\t2026-10-11 08:12:15\t1\t0\t1\t0
        2\t2026-10-11 08:25:40\t1\t0\t1\t0
        3\t2026-10-11 08:29:10\t1\t0\t1\t0
        4\t2026-10-11 08:48:22\t1\t0\t1\t0
        7\t2026-10-11 07:54:10\t1\t0\t1\t0
        8\t2026-10-11 08:05:30\t1\t0\t1\t0
       14\t2026-10-11 08:35:12\t1\t0\t1\t0
       17\t2026-10-11 08:52:45\t1\t0\t1\t0
       19\t2026-10-11 08:47:05\t1\t0\t1\t0
        1\t2026-10-11 16:34:02\t1\t1\t1\t0
        7\t2026-10-11 16:02:48\t1\t1\t1\t0
       14\t2026-10-11 16:05:10\t1\t1\t1\t0`;

const fmtDate = (d: string) => d.split('-').reverse().join('/');
const p2 = (n: number) => String(n).padStart(2, '0');

/** Cellule Excel en texte : les dates et heures sont lues comme valeurs, quel que soit leur format d'affichage */
function excelCell(v: unknown): string {
  if (v instanceof Date) {
    // Excel arrondit parfois à la seconde près : 08:28:59,999 → 08:29
    const d = new Date(Math.round(v.getTime() / 60000) * 60000);
    const time = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
    return d.getFullYear() < 1901 ? time : `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${time}`;
  }
  return String(v ?? '');
}

/**
 * Import du matin : le fichier copié sur la clé USB (AttLog, CSV, Excel) ou une photo / un PDF du rapport
 * imprimé par la pointeuse. Les documents image sont lus par OpenOCR dans le navigateur.
 * Fidélité : chaque ligne du document est comptée (importée, à vérifier ou sans pointage), tous les pointages
 * lus sont affichés et conservés, et les absences déduites sont listées à part et peuvent être refusées.
 */
export const UsbImportPanel: React.FC = () => {
  const { employees, attendanceRecords, companySettings, calculateStatus, applyAttendanceImport, setCurrentView } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [markAbsents, setMarkAbsents] = useState(true);
  const [done, setDone] = useState<{ count: number; absents: number; dates: string[] } | null>(null);

  const analyse = (fileName: string, method: Method, rows: string[][], confidences?: number[]) => {
    const read = readAttendanceRows(rows, employees, { ocr: method === 'ocr', confidences });
    setMarkAbsents(true);
    setPreview({
      fileName, method, days: groupByDay(read.rows), unknown: read.unknown, ignored: read.ignored,
      totalLines: read.totalLines, removed: 0, rawText: rows.map(r => r.join('  ')).join('\n'),
    });
  };

  const handleFile = async (file: File) => {
    setError(null); setPreview(null); setDone(null);
    try {
      if (/\.(xlsx?|xlsm|ods)$/i.test(file.name)) {
        setBusy('Lecture du classeur Excel…');
        const XLSX = await import('xlsx');
        const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const rows = wb.SheetNames.flatMap(n => XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, raw: true, defval: '' }));
        analyse(file.name, 'excel', rows.map(r => r.map(excelCell)));
      } else if (file.type.startsWith('image/') || /\.(pdf|png|jpe?g|webp|bmp)$/i.test(file.name)) {
        setBusy('Préparation du document…');
        const ocr = await import('../../ocr/openocr');
        const pages = await ocr.fileToCanvases(file);
        const lines: { cells: string[]; confidence: number }[] = [];
        for (let i = 0; i < pages.length; i++) {
          const boxes = await ocr.runOcr(pages[i], m => setBusy(pages.length > 1 ? `Page ${i + 1}/${pages.length} · ${m}` : m));
          lines.push(...ocr.boxesToLines(boxes));
        }
        analyse(file.name, 'ocr', lines.map(l => l.cells), lines.map(l => l.confidence));
      } else {
        setBusy('Lecture du fichier…');
        analyse(file.name, 'texte', textToRows(decodeText(await file.arrayBuffer())));
      }
    } catch (e) {
      setError(`Lecture impossible : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const removeDay = (i: number) => setPreview(p => p && { ...p, days: p.days.filter((_, j) => j !== i), removed: p.removed + 1 });

  // Absences déduites (même règle que l'enregistrement) : affichées avant validation
  const absents = useMemo(() => {
    if (!preview) return [];
    const existing = new Set(attendanceRecords.map(r => `${r.employeeId}|${r.date}`));
    return absentCandidates(preview.days, employees, existing, companySettings.workingDays || []);
  }, [preview, attendanceRecords, employees, companySettings.workingDays]);

  const punchLines = preview ? preview.days.reduce((n, d) => n + d.lines.length, 0) : 0;
  const uncertain = preview ? preview.days.filter(d => d.confidence !== undefined && d.confidence < OCR_SURE).length : 0;

  const validate = () => {
    if (!preview) return;
    const warnings = [
      ...preview.unknown.map(u => `Ligne ${u.line} : ${u.hint}`),
      ...(preview.removed ? [`${preview.removed} journée(s) retirée(s) par l'opérateur`] : []),
    ];
    setDone(applyAttendanceImport(preview.fileName, preview.days, warnings, markAbsents));
    setPreview(null);
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand" />
            Import du matin : données de la pointeuse (clé USB, Excel, photo ou PDF)
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Sur la pointeuse : Menu › Clé USB › Télécharger les présences. Importez ici le fichier de la clé (AttLog.dat, .txt, .csv),
            la liste Excel, ou une photo / un PDF du rapport imprimé (lu par OpenOCR). Chaque agent est retrouvé par son matricule,
            son ID pointeuse ou son nom ; le premier pointage du jour est l'entrée, le dernier la sortie. Rien n'est enregistré avant
            votre validation, et chaque ligne du document apparaît dans le compte rendu.
          </p>
        </div>
        <button
          onClick={() => analyse('AttLog_exemple_ZKTeco.dat', 'texte', textToRows(SAMPLE))}
          className="shrink-0 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          title="Charger un exemple de fichier AttLog de la pointeuse"
        >
          Charger un exemple
        </button>
      </div>

      <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 text-center space-y-2">
        <input
          type="file"
          id="zk-file-upload"
          className="hidden"
          accept=".dat,.csv,.txt,.log,.xls,.xlsx,.pdf,image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
        <label htmlFor="zk-file-upload" className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-brand font-bold text-xs hover:bg-purple-100 transition-colors ${busy ? 'pointer-events-none opacity-60' : ''}`}>
          <Upload className="w-3.5 h-3.5" />
          Choisir le fichier (AttLog.dat, .csv, Excel, photo ou PDF du rapport)
        </label>
        {busy && (
          <p className="flex items-center justify-center gap-2 text-xs font-semibold text-brand" role="status">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy}
          </p>
        )}
        {error && <p className="text-xs font-semibold text-rose-600" role="alert">{error}</p>}
      </div>

      {preview && (
        <div className="space-y-3">
          {/* Compte rendu : toutes les lignes du document sont comptées */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1" data-import-summary>
            <p className="text-slate-700">
              <b className="text-brand">{preview.fileName}</b> · {METHOD_LABEL[preview.method]} · <b>{preview.totalLines}</b> ligne(s) lue(s) :
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              <li><b className="text-emerald-700">{punchLines}</b> ligne(s) de pointage → <b>{preview.days.length}</b> journée(s) d'agent</li>
              <li><b className="text-amber-700">{preview.unknown.length}</b> à vérifier (non importées)</li>
              <li><b className="text-slate-600">{preview.ignored.length}</b> sans pointage (titres, en-têtes)</li>
              {preview.removed > 0 && <li><b className="text-rose-600">{preview.removed}</b> journée(s) retirée(s) par vous</li>}
            </ul>
            {preview.method === 'ocr' && (
              <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <ScanText className="w-3.5 h-3.5" /> Lecture OCR : comparez chaque heure avec le document.
                {uncertain > 0 && <span className="text-amber-700"> {uncertain} journée(s) signalée(s) « lecture incertaine ».</span>}
              </p>
            )}
          </div>

          {preview.days.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Agent</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Pointages lus</th>
                    <th className="py-2.5 px-3 text-center">Entrée</th>
                    <th className="py-2.5 px-3 text-center">Sortie</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                    <th className="py-2.5 px-3">Reconnu par</th>
                    <th className="py-2.5 px-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.days.map((d, i) => {
                    const { status, lateMinutes } = calculateStatus(d.emp.heureEntreeNormale, d.checkIn, d.emp.toleranceMinutes);
                    const unsure = d.confidence !== undefined && d.confidence < OCR_SURE;
                    return (
                      <tr key={`${d.emp.matricule}-${d.date}`} className={unsure ? 'bg-amber-50/70' : ''}>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <EmployeeAvatar matricule={d.emp.matricule} size={28} />
                            <div>
                              <p className="font-bold text-slate-900">{d.emp.nom} {d.emp.postnom} {d.emp.prenom}</p>
                              <p className="font-mono text-[10px] text-slate-500">{d.emp.matricule} · ID {d.emp.zktecoBioId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono">{fmtDate(d.date)}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                          {d.punches.join(' · ')}
                          <span className="block text-[10px] text-slate-400">ligne{d.lines.length > 1 ? 's' : ''} {d.lines.join(', ')}{d.duplicates ? ` · ${d.duplicates} doublon(s) identique(s)` : ''}</span>
                          {unsure && <span className="block text-[10px] font-bold text-amber-700">Lecture incertaine ({Math.round((d.confidence ?? 0) * 100)} %) : à vérifier</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">{d.checkIn}</td>
                        <td className="py-2 px-3 text-center font-mono">{d.checkOut ?? '—'}</td>
                        <td className="py-2 px-3 text-center">
                          {status === 'RETARD'
                            ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">Retard {lateMinutes} min</span>
                            : <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">Présent</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{MATCH_LABEL[d.matchedBy]}</td>
                        <td className="py-2 px-3 text-right">
                          <button onClick={() => removeDay(i)} className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Ne pas importer cette journée" aria-label={`Ne pas importer ${d.emp.nom} le ${fmtDate(d.date)}`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold">
              Aucun pointage d'agent reconnu dans ce document. Vérifiez que les ID pointeuse sont renseignés sur les fiches des employés.
            </p>
          )}

          {preview.unknown.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Lignes à vérifier, non importées ({preview.unknown.length})</p>
              <ul className="list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto">
                {preview.unknown.map(u => <li key={u.line}>Ligne {u.line} : {u.hint} — <span className="font-mono">{u.raw}</span></li>)}
              </ul>
            </div>
          )}

          {preview.ignored.length > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer font-semibold text-slate-600">Lignes sans pointage ({preview.ignored.length}) : titres, en-têtes</summary>
              <ul className="mt-1 pl-4 list-disc max-h-32 overflow-y-auto text-slate-500">
                {preview.ignored.map(l => <li key={l.line}>Ligne {l.line} : <span className="font-mono">{l.raw}</span></li>)}
              </ul>
            </details>
          )}

          {/* Absences déduites : elles ne figurent pas dans le fichier, l'opérateur décide */}
          {absents.length > 0 && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/60 text-[11px] space-y-1.5">
              <label className="flex items-start gap-2 font-semibold text-rose-900 cursor-pointer">
                <input type="checkbox" checked={markAbsents} onChange={e => setMarkAbsents(e.target.checked)} className="mt-0.5" />
                <span>
                  Marquer absents les {absents.length} agent(s) actif(s) sans aucun pointage dans ce fichier
                  {' '}({[...new Set(absents.map(a => fmtDate(a.date)))].join(', ')}, jours ouvrés seulement).
                  Ces absences sont déduites : elles ne sont pas écrites dans le fichier.
                </span>
              </label>
              <details>
                <summary className="cursor-pointer text-rose-800">Voir la liste</summary>
                <p className="mt-1 text-rose-900">{absents.map(a => `${a.emp.nom} ${a.emp.prenom} (${fmtDate(a.date)})`).join(' · ')}</p>
              </details>
            </div>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-slate-600">Texte complet lu dans le document</summary>
            <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-green-400 font-mono text-[11px] max-h-40 overflow-auto whitespace-pre-wrap">{preview.rawText}</pre>
          </details>

          <div className="flex justify-end gap-2">
            <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200">Annuler</button>
            <button
              onClick={validate}
              disabled={!preview.days.length}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valider et mettre à jour le tableau de bord
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="p-4 rounded-xl text-xs bg-emerald-50 text-emerald-800 flex flex-wrap items-center justify-between gap-3" role="status">
          <p className="font-bold">
            {done.count} présence(s) et {done.absents} absence(s) enregistrées pour le {done.dates.map(fmtDate).join(', ')}.
            Le tableau de bord, le carnet des présences, les retards et les rapports sont à jour.
          </p>
          <button onClick={() => setCurrentView('dashboard')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700">
            Voir le tableau de bord <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
