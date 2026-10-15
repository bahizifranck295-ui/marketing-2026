import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/** Remplace le caractère ESC brut du lecteur PDF (pdf.js) par « \x1b » : même code, fichier en texte pur */
const escapeControlChars = (): Plugin => ({
  name: 'escape-control-chars',
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === 'asset' && /\.m?js$/.test(file.fileName) && typeof file.source !== 'string') {
        const text = new TextDecoder().decode(file.source);
        if (text.includes('\x1b')) file.source = text.replaceAll('\x1b', '\\x1b');
      } else if (file.type === 'asset' && typeof file.source === 'string' && file.source.includes('\x1b')) {
        file.source = file.source.replaceAll('\x1b', '\\x1b');
      } else if (file.type === 'chunk' && file.code.includes('\x1b')) {
        file.code = file.code.replaceAll('\x1b', '\\x1b');
      }
    }
  },
});

export default defineConfig(() => {
  return {
    // Chemins relatifs : l'application fonctionne aussi hors de la racine du site (aperçu publié)
    base: './',
    // onnxruntime-web charge son module WebAssembly à côté de lui-même : pas de pré-bundling en dev
    optimizeDeps: { exclude: ['onnxruntime-web'] },
    plugins: [react(), tailwindcss(), escapeControlChars()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
