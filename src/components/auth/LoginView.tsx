import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, Sun, Moon, Globe, ArrowRight, Fingerprint } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { 
    setCurrentUser, allUsers, theme, toggleTheme, language, setLanguage, 
    companySettings 
  } = useApp();

  const [email, setEmail] = useState('admin@premidis.cd');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotModal, setForgotModal] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const foundUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (foundUser) {
        setCurrentUser(foundUser);
      } else {
        setErrorMsg('Identifiant ou mot de passe incorrect. Veuillez vérifier vos accès ou contacter l\'administrateur.');
      }
      setLoading(false);
    }, 600);
  };

  const handleQuickDemoLogin = (userRole: string) => {
    const user = allUsers.find(u => u.role === userRole) || allUsers[0];
    setEmail(user.email);
    setPassword('demo2026');
    setCurrentUser(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F2F1FA] dark:bg-[#0B0F19] text-[#1D2030] dark:text-white transition-colors relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7C4DFF]/15 dark:bg-[#7C4DFF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#59CBE8]/15 dark:bg-[#59CBE8]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top right quick controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800 text-xs font-bold transition-colors"
          title="Changer langue"
        >
          <span className="uppercase">{language}</span>
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-800 transition-colors"
          title="Changer thème"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
        </button>
      </div>

      <div className="w-full max-w-md glass-card rounded-3xl p-8 shadow-2xl relative z-10 border border-white/60 dark:border-gray-800/80">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2 flex items-center justify-center shadow-md mx-auto mb-3 overflow-hidden">
            <img 
              src={`${import.meta.env.BASE_URL}premidis-symbol.png`} 
              alt="Logo PREMIDIS S.A.R.L." 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight text-[#1D2030] dark:text-white">
            PREMIDIS <span className="text-[#7C4DFF]">Attendance</span>
          </h1>
          <p className="text-xs text-[#717787] dark:text-gray-400 mt-1">
            PREMIDIS SARL · Commune de Karisimbi, Goma
          </p>
          <p className="text-[11px] font-mono text-gray-400">
            N° RCCM : CD/GOM/RCCM/14-B-0203
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">
              Adresse e-mail ou Identifiant
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.nom@premidis.cd"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-[#7C4DFF]/40 text-xs font-medium"
              />
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-gray-600 dark:text-gray-400 font-bold">Mot de passe</label>
              <button
                type="button"
                onClick={() => setForgotModal(true)}
                className="text-[11px] text-[#7C4DFF] hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-[#7C4DFF]/40 text-xs font-mono font-bold"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-[#7C4DFF]"
              />
              <span>Se souvenir de moi</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#7C4DFF] text-white font-bold hover:bg-[#6a38f3] shadow-md shadow-[#7C4DFF]/25 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Switcher */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-xs">
          <p className="text-center text-gray-400 font-bold mb-2 text-[10px] uppercase tracking-wider">
            Accès Démonstration Rapide (Choix du Rôle)
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoLogin('ADMIN')}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-left transition-colors"
            >
              <p className="font-bold text-gray-900 dark:text-white text-[11px]">Administrateur</p>
              <p className="text-[10px] text-gray-400">Franck Bahizi</p>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('SECRETAIRE')}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-left transition-colors"
            >
              <p className="font-bold text-gray-900 dark:text-white text-[11px]">Secrétaire</p>
              <p className="text-[10px] text-gray-400">Sylvie Masika</p>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('RH')}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-left transition-colors"
            >
              <p className="font-bold text-gray-900 dark:text-white text-[11px]">Responsable RH</p>
              <p className="text-[10px] text-gray-400">Justin Paluku</p>
            </button>

            <button
              onClick={() => handleQuickDemoLogin('DIRECTEUR')}
              className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/60 text-left transition-colors"
            >
              <p className="font-bold text-gray-900 dark:text-white text-[11px]">Direction Générale</p>
              <p className="text-[10px] text-gray-400">D. Kasereka</p>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-gray-400">
          Système interne sécurisé réservé au personnel habilité de PREMIDIS SARL
        </div>
      </div>

      {/* Forgot modal */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-5 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Récupération de Compte</h3>
            <p className="text-gray-500 leading-relaxed">
              Pour des motifs de sécurité interne à PREMIDIS SARL, la réinitialisation de mot de passe doit être validée par le service informatique ou la Direction RH.
            </p>
            <p className="text-gray-600 dark:text-gray-300 font-mono text-[11px]">
              Contact : {companySettings.phone} | {companySettings.email}
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setForgotModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#7C4DFF] text-white font-bold"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
