import React, { useCallback, useRef, useState } from 'react';
import {
  ArrowRight, ChevronDown, ChevronUp, ClipboardList, Crown, Eye, EyeOff,
  Loader2, Lock, ShieldCheck, User, UserCog, Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { LOGO_ALT, LOGO_SRC } from '../../app/brand';
import { LoginIntro, shouldPlayIntro } from '../login/LoginIntro';
import { checkPassword, INITIAL_PASSWORD } from '../../utils/password';
import { User as AppUser } from '../../types';

// Même parcours que PREMIDIS ERP : introduction du logo, puis formulaire et comptes de démonstration.
// La page de connexion s'affiche à chaque ouverture ; un compte de démonstration remplit seulement le
// formulaire, l'accès passe toujours par « Se connecter » et la vérification du mot de passe.
const DEMO_PASSWORD = INITIAL_PASSWORD;

const ROLE_ICON: Record<string, React.ElementType> = {
  ADMIN: ShieldCheck,
  DIRECTEUR: Crown,
  RH: UserCog,
  SECRETAIRE: ClipboardList,
};
const ROLE_HINT: Record<string, string> = {
  ADMIN: 'Administration système',
  DIRECTEUR: 'Accès complet en lecture',
  RH: 'Personnel, pointages, sanctions',
  SECRETAIRE: 'Pointages du jour',
};
/** Comptes visibles par défaut ; les autres apparaissent avec « Voir tous les comptes de démonstration » */
const MAIN_ROLES = ['ADMIN', 'DIRECTEUR'];

export const LoginView: React.FC = () => {
  const { setCurrentUser, allUsers, companySettings, getRoleLabel, addAuditLog } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  // Introduction : « playing » (page cachée) → « revealing » (le logo rejoint sa place) → « done »
  const [phase, setPhase] = useState<'playing' | 'revealing' | 'done'>(() => (shouldPlayIntro() ? 'playing' : 'done'));
  const logoRef = useRef<HTMLImageElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    setTimeout(async () => {
      const login = email.toLowerCase().trim();
      const foundUser = allUsers.find(u => u.email.toLowerCase() === login || u.name.toLowerCase() === login);
      const valid = foundUser ? await checkPassword(foundUser, password) : false;
      if (!foundUser || !valid) {
        setErrorMsg('Nom d\'utilisateur, email ou mot de passe incorrect.');
        addAuditLog('CONNEXION_REFUSEE', login || '(vide)', 'Identifiants incorrects');
      } else if (foundUser.active === false) {
        setErrorMsg('Ce compte est désactivé. Contactez l\'administrateur.');
      } else {
        setCurrentUser(foundUser);
        addAuditLog('CONNEXION', foundUser.name, `Connexion sous le profil ${getRoleLabel(foundUser.role)}`);
      }
      setLoading(false);
    }, 400);
  };

  const target = useCallback(() => logoRef.current, []);
  const onReveal = useCallback(() => setPhase(p => (p === 'playing' ? 'revealing' : p)), []);
  const onDone = useCallback(() => setPhase('done'), []);
  const hidden = phase === 'playing';

  const activeUsers = allUsers.filter(u => u.active !== false && !u.passwordHash);
  const mainDemos = MAIN_ROLES.map(r => activeUsers.find(u => u.role === r)).filter(Boolean) as AppUser[];
  const moreDemos = activeUsers.filter(u => !mainDemos.includes(u));

  const demoCard = (u: AppUser, i: number) => {
    const Icon = ROLE_ICON[u.role] || Users;
    const active = email.toLowerCase() === u.email.toLowerCase();
    return (
      <button
        key={u.id}
        type="button"
        data-demo-account={u.role}
        onClick={() => { setEmail(u.email); setPassword(DEMO_PASSWORD); setErrorMsg(''); }}
        style={{ transitionDelay: `${i * 60}ms` }}
        className={`group flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
          active ? 'border-brand bg-brand/10' : 'border-slate-200 bg-white/60 hover:border-brand/60 hover:bg-brand/5'
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#087bff] to-[#8200ff] text-white shadow-md">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">{getRoleLabel(u.role)}</span>
          <span className="block truncate text-[11px] text-slate-500">{u.email}</span>
          <span className="block truncate text-[11px] font-semibold text-brand">{ROLE_HINT[u.role] || u.name}</span>
        </span>
      </button>
    );
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${hidden ? 'login-hidden' : ''}`} data-login-phase={phase}>
      <div className="login-bg login-reveal" aria-hidden>
        <div className="login-bg-horizon" />
      </div>

      <div
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-8"
        inert={hidden || undefined}
      >
        <ThemeToggle className="login-reveal absolute right-4 top-4" />

        {/* Logo officiel et présentation */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            ref={logoRef}
            src={LOGO_SRC}
            alt={LOGO_ALT}
            data-login-logo
            style={{ aspectRatio: '1683 / 935' }}
            className={`logo-tile h-24 w-auto rounded-2xl object-contain p-1.5 shadow-[0_0_40px_rgba(8,123,255,0.35)] sm:h-28 ${
              phase === 'done' ? '' : 'opacity-0'
            }`}
          />
          <p className="login-reveal max-w-xs text-sm text-slate-600">
            Le suivi des présences, des retards et des sanctions du personnel, au même endroit.
          </p>
          <span className="login-reveal rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] text-slate-600">
            <span className="font-bold text-brand">PREMIDIS Attendance</span> · Présences, pointages ZKTeco et sanctions
          </span>
        </div>

        {/* Formulaire de connexion */}
        <div className="login-glass login-reveal w-full space-y-5 rounded-3xl p-5 sm:p-6" style={{ transitionDelay: '120ms' }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Nom d'utilisateur ou email</span>
              <span className="relative block">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="text"
                  name="login"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nom d'utilisateur ou email"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white/70 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </span>
            </label>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <label htmlFor="login-password">Mot de passe</label>
                <button type="button" onClick={() => setForgotModal(true)} className="text-[11px] font-semibold text-brand hover:underline">
                  Mot de passe oublié ?
                </button>
              </div>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white/70 pl-9 pr-10 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-brand"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </div>

            {errorMsg && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#087bff] to-[#8200ff] text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(8,123,255,0.7)] transition hover:brightness-110 disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Se connecter
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Comptes de démonstration (comptes qui ont encore le mot de passe initial) */}
          {mainDemos.length + moreDemos.length > 0 && (
          <div className="space-y-3" data-demo-accounts>
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              Comptes de démonstration
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">{mainDemos.map(demoCard)}</div>
            {showAll && moreDemos.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2" data-demo-more>{moreDemos.map(demoCard)}</div>
            )}
            {moreDemos.length > 0 && (
              <button
                type="button"
                data-demo-toggle
                aria-expanded={showAll}
                onClick={() => setShowAll(v => !v)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition hover:border-brand/60 hover:text-brand"
              >
                {showAll ? 'Masquer les autres comptes' : 'Voir tous les comptes de démonstration'}
                {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
            <p className="text-center text-[11px] text-slate-500">
              Mot de passe de démonstration : <span className="font-semibold">{DEMO_PASSWORD}</span>
            </p>
          </div>
          )}
        </div>
      </div>

      {/* Mot de passe oublié */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Récupération de compte</h3>
            <p className="text-slate-500 leading-relaxed">
              Pour des motifs de sécurité interne à PREMIDIS SARL, la réinitialisation de mot de passe doit être validée par le service informatique ou la Direction RH.
            </p>
            <p className="text-slate-600 font-mono text-[11px]">
              Contact : {companySettings.phone} | {companySettings.email}
            </p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setForgotModal(false)} className="h-9 px-4 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-strong">
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {phase !== 'done' && <LoginIntro target={target} onReveal={onReveal} onDone={onDone} />}
    </div>
  );
};
