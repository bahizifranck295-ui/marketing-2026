// Les bibliothèques PDF (jsPDF, capture de l'aperçu) ne sont chargées qu'au premier export,
// pour garder l'ouverture de l'application rapide sur une connexion mobile.
type ExportUtils = typeof import('./exportUtils');
type PreviewPdf = typeof import('./previewPdf');

export const generateAttendancePdf = async (...args: Parameters<ExportUtils['generateAttendancePdf']>) =>
  (await import('./exportUtils')).generateAttendancePdf(...args);

export const generateEmployeesPdf = async (...args: Parameters<ExportUtils['generateEmployeesPdf']>) =>
  (await import('./exportUtils')).generateEmployeesPdf(...args);

export const exportPreviewToPdf = async (...args: Parameters<PreviewPdf['exportPreviewToPdf']>) =>
  (await import('./previewPdf')).exportPreviewToPdf(...args);
