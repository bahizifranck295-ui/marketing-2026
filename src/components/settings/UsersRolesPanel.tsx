import React, { useState } from 'react';
import { hashPassword } from '../../utils/password';
import { useApp } from '../../context/AppContext';
import { AppModule, PermissionAction, User } from '../../types';
import { APP_MODULES, PERMISSION_ACTIONS, emptyPermissions } from '../../data/permissions';
import { UserPlus, ShieldPlus, Pencil, Trash2, Check, X, Lock, Power, LogIn, Users, KeyRound } from 'lucide-react';

type UserForm = { name: string; email: string; department: string; role: string; password: string };
const EMPTY_FORM: UserForm = { name: '', email: '', department: '', role: 'SECRETAIRE', password: '' };

const inputCls = 'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none';

export const UsersRolesPanel: React.FC = () => {
  const {
    allUsers, addUser, updateUser, deleteUser, currentUser, setCurrentUser,
    roles, addRole, updateRole, deleteRole, getRoleLabel, can, departments, addAuditLog
  } = useApp();

  const canManage = can('settings', 'edit');
  const isAdmin = currentUser?.role === 'ADMIN';
  const [tab, setTab] = useState<'USERS' | 'ROLES'>('USERS');

  // ---- Utilisateurs ----
  const [form, setForm] = useState<UserForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);

  const openCreate = () => { setForm({ ...EMPTY_FORM, role: roles[roles.length - 1]?.id || 'SECRETAIRE' }); setEditingId(null); setFormError(''); };
  const openEdit = (u: User) => { setForm({ name: u.name, email: u.email, department: u.department || '', role: u.role, password: '' }); setEditingId(u.id); setFormError(''); };

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim() || !email) { setFormError('Le nom et l\'adresse e-mail sont obligatoires.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Adresse e-mail invalide.'); return; }
    if (allUsers.some(u => u.email.toLowerCase() === email && u.id !== editingId)) { setFormError('Un compte utilise déjà cette adresse e-mail.'); return; }
    const editing = editingId ? allUsers.find(u => u.id === editingId) : undefined;
    if (!editing && form.password.length < 6) { setFormError('Choisissez un mot de passe d\'au moins 6 caractères.'); return; }
    if (editing && form.password && form.password.length < 6) { setFormError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    // L'empreinte du mot de passe dépend de l'e-mail : un nouvel e-mail demande de ressaisir le mot de passe
    if (editing?.passwordHash && editing.email.toLowerCase() !== email && !form.password) {
      setFormError('L\'e-mail a changé : saisissez aussi un nouveau mot de passe.'); return;
    }
    const data: Partial<User> = { name: form.name.trim(), email, department: form.department, role: form.role };
    if (form.password) data.passwordHash = await hashPassword(email, form.password);
    if (editingId) updateUser(editingId, data); else addUser({ ...(data as Omit<User, 'id'>), active: true });
    setForm(null); setEditingId(null);
  };

  // ---- Rôles ----
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || 'ADMIN');
  const [newRole, setNewRole] = useState<{ label: string; description: string } | null>(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(false);
  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];
  const roleLocked = !canManage || selectedRole?.id === 'ADMIN';
  const usersInRole = (id: string) => allUsers.filter(u => u.role === id).length;

  const togglePermission = (module: AppModule, action: PermissionAction) => {
    if (!selectedRole || roleLocked) return;
    const current = selectedRole.permissions[module] || [];
    let next = current.includes(action) ? current.filter(a => a !== action) : [...current, action];
    // Sans « Consulter », les autres droits du module n'ont pas de sens
    if (action === 'view' && !next.includes('view')) next = [];
    if (action !== 'view' && next.length > 0 && !next.includes('view')) next = ['view', ...next];
    updateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, [module]: next } });
  };

  const toggleModuleRow = (module: AppModule) => {
    if (!selectedRole || roleLocked) return;
    const all = PERMISSION_ACTIONS.map(a => a.id);
    const has = selectedRole.permissions[module]?.length === all.length;
    updateRole(selectedRole.id, { permissions: { ...selectedRole.permissions, [module]: has ? [] : all } });
  };

  const submitRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole?.label.trim()) return;
    addRole({ label: newRole.label.trim(), description: newRole.description.trim(), permissions: emptyPermissions() });
    setNewRole(null);
  };

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Utilisateurs, Rôles & Permissions</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Créez les comptes, attribuez un rôle et définissez, module par module, ce que chaque rôle peut faire.
          </p>
        </div>
        <div className="p-1 bg-slate-100 rounded-xl flex text-xs font-bold">
          <button onClick={() => setTab('USERS')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${tab === 'USERS' ? 'bg-white text-brand shadow-xs' : 'text-slate-500'}`}>
            <Users className="w-3.5 h-3.5" /> Utilisateurs ({allUsers.length})
          </button>
          <button onClick={() => setTab('ROLES')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${tab === 'ROLES' ? 'bg-white text-brand shadow-xs' : 'text-slate-500'}`}>
            <KeyRound className="w-3.5 h-3.5" /> Rôles & Permissions ({roles.length})
          </button>
        </div>
      </div>

      {!canManage && (
        <p className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
          <Lock className="w-3.5 h-3.5" /> Lecture seule : votre rôle n'a pas la permission « Modifier » sur les Paramètres.
        </p>
      )}

      {/* ================= UTILISATEURS ================= */}
      {tab === 'USERS' && (
        <div className="space-y-4">
          {canManage && !form && (
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand text-white text-xs font-semibold">
              <UserPlus className="w-3.5 h-3.5" /> Nouvel utilisateur
            </button>
          )}

          {form && (
            <form onSubmit={submitUser} className="p-4 rounded-xl border border-brand/30 bg-brand/5 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="md:col-span-5 font-bold text-slate-900">
                {editingId ? 'Modifier le compte' : 'Créer un compte utilisateur'}
              </div>
              <label className="space-y-1"><span className="font-semibold text-slate-500">Nom complet</span>
                <input id="usr-name" className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex. Clarisse Kyakimwa" />
              </label>
              <label className="space-y-1"><span className="font-semibold text-slate-500">E-mail de connexion</span>
                <input id="usr-email" type="email" className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="prenom.nom@premidis.cd" />
              </label>
              <label className="space-y-1"><span className="font-semibold text-slate-500">Service</span>
                <select id="usr-dep" className={inputCls} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  <option value="">—</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </label>
              <label className="space-y-1"><span className="font-semibold text-slate-500">{editingId ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'}</span>
                <input id="usr-password" type="password" autoComplete="new-password" className={inputCls} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editingId ? 'Laisser vide pour ne pas changer' : '6 caractères minimum'} />
              </label>
              <label className="space-y-1"><span className="font-semibold text-slate-500">Rôle</span>
                <select id="usr-role" className={inputCls} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  disabled={editingId === currentUser?.id}>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </label>
              {formError && <p className="md:col-span-5 text-rose-600 font-semibold">{formError}</p>}
              <div className="md:col-span-5 flex gap-2">
                <button type="submit" className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-white font-semibold">
                  <Check className="w-3.5 h-3.5" /> {editingId ? 'Enregistrer' : 'Créer le compte'}
                </button>
                <button type="button" onClick={() => { setForm(null); setEditingId(null); }} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-600">
                  <X className="w-3.5 h-3.5" /> Annuler
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map(u => {
                  const isSelf = u.id === currentUser?.id;
                  const active = u.active !== false;
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{u.name} {isSelf && <span className="text-[10px] text-brand">(vous)</span>}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                        {!u.passwordHash && (
                          <p className="text-[10px] font-semibold text-amber-700">Mot de passe initial : à changer (Modifier)</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.department || '—'}</td>
                      <td className="px-4 py-3">
                        {canManage && !isSelf ? (
                          <select value={u.role} onChange={e => updateUser(u.id, { role: e.target.value })}
                            className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-900">
                            {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-brand/10 text-brand">{getRoleLabel(u.role)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {confirmDeleteUser === u.id ? (
                            <>
                              <span className="text-rose-600 font-semibold">Supprimer ce compte ?</span>
                              <button onClick={() => { deleteUser(u.id); setConfirmDeleteUser(null); }} className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold">Oui</button>
                              <button onClick={() => setConfirmDeleteUser(null)} className="px-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-600">Non</button>
                            </>
                          ) : (
                            <>
                              {/* Aperçu d'un autre compte : réservé à l'Administrateur (sinon élévation de privilèges) */}
                              {isAdmin && !isSelf && active && (
                                <button title="Voir l'application avec ce compte (Administrateur uniquement)"
                                  onClick={() => { setCurrentUser(u); addAuditLog('CHANGEMENT_UTILISATEUR', u.name, `Connecté sous le profil ${getRoleLabel(u.role)}`); }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-brand"><LogIn className="w-3.5 h-3.5" /></button>
                              )}
                              {canManage && (
                                <button title="Modifier" onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-brand"><Pencil className="w-3.5 h-3.5" /></button>
                              )}
                              {canManage && !isSelf && (
                                <button title={active ? 'Désactiver le compte' : 'Réactiver le compte'} onClick={() => updateUser(u.id, { active: !active })}
                                  className={`p-1.5 rounded-lg ${active ? 'text-slate-500 hover:text-amber-500' : 'text-emerald-600'}`}><Power className="w-3.5 h-3.5" /></button>
                              )}
                              {canManage && !isSelf && (
                                <button title="Supprimer" onClick={() => setConfirmDeleteUser(u.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= RÔLES & PERMISSIONS ================= */}
      {tab === 'ROLES' && selectedRole && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5">
          {/* Liste des rôles */}
          <div className="space-y-2">
            {roles.map(r => (
              <button key={r.id} onClick={() => { setSelectedRoleId(r.id); setConfirmDeleteRole(false); }}
                className={`w-full text-left p-3 rounded-xl border text-xs transition-colors ${r.id === selectedRole.id ? 'border-brand/50 bg-brand/10' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{r.label}</span>
                  <span className="text-[10px] font-mono text-slate-500">{usersInRole(r.id)} compte(s)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{r.description || 'Rôle personnalisé'}</p>
              </button>
            ))}

            {canManage && (newRole ? (
              <form onSubmit={submitRole} className="p-3 rounded-xl border border-brand/30 bg-brand/5 space-y-2 text-xs">
                <input id="role-label" className={inputCls} placeholder="Nom du rôle (ex. Chef d'équipe)" value={newRole.label} onChange={e => setNewRole({ ...newRole, label: e.target.value })} />
                <input id="role-desc" className={inputCls} placeholder="Description (facultatif)" value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 px-3 py-1.5 rounded-xl bg-brand text-white font-semibold">Créer</button>
                  <button type="button" onClick={() => setNewRole(null)} className="px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-600">Annuler</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setNewRole({ label: '', description: '' })} className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-brand">
                <ShieldPlus className="w-3.5 h-3.5" /> Nouveau rôle
              </button>
            ))}
          </div>

          {/* Matrice des permissions */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Permissions : {selectedRole.label}
                  {selectedRole.id === 'ADMIN' && <span className="flex items-center gap-1 text-[10px] text-amber-600"><Lock className="w-3 h-3" /> accès total verrouillé</span>}
                </h4>
                <p className="text-[11px] text-slate-500">Cochez ce que ce rôle peut faire dans chaque module. Un module sans « Consulter » est masqué du menu.</p>
              </div>
              {canManage && !selectedRole.system && (
                confirmDeleteRole ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-rose-600 font-semibold">Supprimer ce rôle ?</span>
                    <button onClick={() => { deleteRole(selectedRole.id); setSelectedRoleId('ADMIN'); setConfirmDeleteRole(false); }} className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold">Oui</button>
                    <button onClick={() => setConfirmDeleteRole(false)} className="px-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-600">Non</button>
                  </div>
                ) : usersInRole(selectedRole.id) > 0 ? (
                  <span className="text-[11px] text-slate-500">Réattribuez ses {usersInRole(selectedRole.id)} compte(s) avant de le supprimer.</span>
                ) : (
                  <button onClick={() => setConfirmDeleteRole(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold">
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer le rôle
                  </button>
                )
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Module</th>
                    {PERMISSION_ACTIONS.map(a => <th key={a.id} className="px-2 py-3 text-center">{a.label}</th>)}
                    <th className="px-2 py-3 text-center">Tout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {APP_MODULES.map(m => {
                    const perms = selectedRole.permissions[m.id] || [];
                    return (
                      <tr key={m.id}>
                        <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">{m.label}</td>
                        {PERMISSION_ACTIONS.map(a => {
                          const on = perms.includes(a.id);
                          return (
                            <td key={a.id} className="px-2 py-2.5 text-center">
                              <button type="button" disabled={roleLocked} onClick={() => togglePermission(m.id, a.id)}
                                aria-pressed={on} aria-label={`${a.label} – ${m.label}`}
                                className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-colors ${on ? 'bg-brand/90 text-white' : 'bg-slate-100 text-transparent'} ${roleLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-neon/40'}`}>
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2.5 text-center">
                          <button type="button" disabled={roleLocked} onClick={() => toggleModuleRow(m.id)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border border-slate-200 text-slate-600 ${roleLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {perms.length === PERMISSION_ACTIONS.length ? 'Aucun' : 'Tous'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
