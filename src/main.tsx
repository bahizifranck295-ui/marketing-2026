import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTheme } from './theme/theme';

// Thème appliqué avant le premier affichage (pas de flash du mauvais thème)
initTheme();

createRoot(document.getElementById('root')!).render(<App />);
