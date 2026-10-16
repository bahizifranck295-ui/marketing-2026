import React from 'react';
import { readAllAppData, downloadText } from '../../utils/storage';

/**
 * Filet de sécurité : si un écran plante, on affiche un message et des sorties possibles
 * au lieu d'une page blanche. Les données ne sont jamais effacées sans confirmation.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Erreur dans l\'application', error, info.componentStack);
  }

  private saveBackup = () => {
    downloadText(`sauvegarde_premidis_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'PREMIDIS Attendance', exportedAt: new Date().toISOString(), data: readAllAppData() }, null, 1));
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-app">
        <div className="glass-card rounded-2xl p-8 max-w-lg space-y-4 text-sm" role="alert">
          <h1 className="text-xl font-bold text-slate-900">L'application a rencontré un problème</h1>
          <p className="text-slate-600">
            Vos données sont toujours enregistrées dans ce navigateur. Rechargez la page ; si le problème revient,
            téléchargez d'abord une sauvegarde puis contactez l'administrateur.
          </p>
          <p className="font-mono text-[11px] text-slate-500 break-words">{this.state.error.message}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-xs">Recharger la page</button>
            <button onClick={this.saveBackup} className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-700">Télécharger une sauvegarde des données</button>
          </div>
        </div>
      </div>
    );
  }
}
