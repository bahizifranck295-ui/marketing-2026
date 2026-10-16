import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SanctionCasesPanel } from './SanctionCasesPanel';
import { SanctionRule, SANCTION_LABELS } from '../../types';
import { Plus, AlertTriangle, Banknote, Snowflake, Flame, Trash2, Edit3, Filter, ShieldCheck } from 'lucide-react';

export const SanctionsView: React.FC = () => {
  const { 
    sanctionRules, 
    addSanctionRule, 
    updateSanctionRule, 
    deleteSanctionRule,
    can
  } = useApp();
  const canCreate = can('sanctions', 'create');
  const canEdit = can('sanctions', 'edit');
  const canDelete = can('sanctions', 'delete');
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'FROZEN'>('ACTIVE');
  const [filterType, setFilterType] = useState<'ALL' | 'RETARD' | 'ABSENCE'>('ALL');
  const [notification, setNotification] = useState<{ message: string; type: 'freeze' | 'unfreeze' | 'delete' | 'success' } | null>(null);

  // Modal State for Create / Edit
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Rule Form state
  const [ruleForm, setRuleForm] = useState<Omit<SanctionRule, 'id'>>({
    name: 'Seuil 2 Absences Non Justifiées',
    targetType: 'ABSENCE',
    period: 'MONTH',
    thresholdLateCount: 0,
    thresholdLateMinutes: 0,
    thresholdAbsenceCount: 2,
    sanctionType: 'RETENUE_SALARIALE_PROPOSEE',
    deductionAmount: 30,
    currency: 'USD',
    isActive: true,
    effectiveDate: new Date().toISOString().substring(0, 10),
    description: 'Retenue compensatoire sur salaire pour absences non justifiées répétées.'
  });

  // Filtered lists
  const activeRules = useMemo(() => {
    return sanctionRules.filter(r => r.isActive);
  }, [sanctionRules]);

  const frozenRules = useMemo(() => {
    return sanctionRules.filter(r => !r.isActive);
  }, [sanctionRules]);

  const displayedRules = useMemo(() => {
    const list = activeTab === 'ACTIVE' ? activeRules : frozenRules;
    if (filterType === 'ALL') return list;
    return list.filter(r => r.targetType === filterType);
  }, [activeTab, activeRules, frozenRules, filterType]);

  const showNotification = (message: string, type: 'freeze' | 'unfreeze' | 'delete' | 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Freeze action: turns rule inactive and removes it from active list
  const handleFreezeRule = (rule: SanctionRule) => {
    updateSanctionRule(rule.id, { isActive: false });
    showNotification(
      `🧊 La sanction « ${rule.name} » a été gelée avec succès. Elle ne fonctionne plus et a été retirée de la liste active.`,
      'freeze'
    );
  };

  // Unfreeze action: turns rule active again and moves back to active list
  const handleUnfreezeRule = (rule: SanctionRule) => {
    updateSanctionRule(rule.id, { isActive: true });
    showNotification(
      `🔥 La sanction « ${rule.name} » a été dégelée et est de nouveau active dans le système.`,
      'unfreeze'
    );
  };

  // Delete action
  const handleDeleteRule = (rule: SanctionRule) => {
    deleteSanctionRule(rule.id);
    setConfirmDeleteRuleId(null);
    showNotification(`🗑️ Le barème « ${rule.name} » a été supprimé.`, 'delete');
  };

  // Open modal for new rule
  const handleOpenCreateModal = () => {
    setEditingRuleId(null);
    setRuleForm({
      name: 'Nouveau Seuil de Retenue',
      targetType: 'RETARD',
      period: 'MONTH',
      thresholdLateCount: 3,
      thresholdLateMinutes: 30,
      thresholdAbsenceCount: 1,
      sanctionType: 'RETENUE_SALARIALE_PROPOSEE',
      deductionAmount: 20,
      currency: 'USD',
      isActive: true,
      effectiveDate: new Date().toISOString().substring(0, 10),
      description: 'Retenue financière appliquée dès franchissement du seuil non justifié.'
    });
    setIsRuleModalOpen(true);
  };

  // Open modal for editing existing rule
  const handleOpenEditModal = (rule: SanctionRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name,
      targetType: rule.targetType,
      period: rule.period,
      thresholdLateCount: rule.thresholdLateCount,
      thresholdLateMinutes: rule.thresholdLateMinutes,
      thresholdAbsenceCount: rule.thresholdAbsenceCount,
      sanctionType: rule.sanctionType,
      deductionAmount: rule.deductionAmount,
      currency: rule.currency,
      exclusionDays: rule.exclusionDays,
      isActive: rule.isActive,
      effectiveDate: rule.effectiveDate,
      description: rule.description
    });
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRuleId) {
      updateSanctionRule(editingRuleId, ruleForm);
      showNotification(`✅ Barème « ${ruleForm.name} » mis à jour avec succès.`, 'success');
    } else {
      addSanctionRule(ruleForm);
      showNotification(`✅ Nouveau barème « ${ruleForm.name} » enregistré et activé.`, 'success');
    }
    setIsRuleModalOpen(false);
    setEditingRuleId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar with ONLY the Configuration button as requested */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Configuration des Seuils & Barèmes de Retenues
          </h1>
          <p className="text-xs text-muted mt-1">
            Gestion des barèmes financiers de seuils de retard ou d'absence, montants retirables et gel des sanctions pour PREMIDIS SARL
          </p>
        </div>

        {/* Action button: + Configurer un Seuil / Retenue */}
        <div className="flex items-center gap-2.5">
          {canCreate && <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-deep text-xs font-bold transition-all shadow-md active:scale-95"
            title="Créer un nouveau seuil de retard ou d'absence avec somme d'argent retirable"
          >
            <Plus className="w-4 h-4" />
            <span>+ Configurer un Seuil / Retenue</span>
          </button>}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 ${
          notification.type === 'freeze'
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : notification.type === 'unfreeze'
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : notification.type === 'delete'
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100 ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Legal & Regulatory Compliance Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[11px] leading-snug">
            <b>Conformité Statutaire PREMIDIS SARL :</b> Les montants retirables configurés dans ces barèmes s'appliquent automatiquement dès franchissement des seuils non justifiés, avec possibilité de geler toute sanction à tout moment.
          </p>
        </div>
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5" /> Barème RH Officiel
        </span>
      </div>

      {/* Dossiers du mois à valider par la Direction */}
      <SanctionCasesPanel />

      {/* MAIN SECTION: BARÈMES DES SOMMES RETIRABLES & GESTION DU GEL DES SANCTIONS */}
      <div className="p-5 rounded-2xl glass-card space-y-5">
        {/* Navigation Tabs (Actives vs Gelées) and Type Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {/* Tab: Active Rules */}
            <button
              type="button"
              onClick={() => setActiveTab('ACTIVE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ACTIVE'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Barèmes Actifs en Vigueur</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'ACTIVE' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {activeRules.length}
              </span>
            </button>

            {/* Tab: Frozen Sanctions */}
            <button
              type="button"
              onClick={() => setActiveTab('FROZEN')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'FROZEN'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-blue-600'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5 text-blue-300" />
              <span>Sanctions Gelées</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === 'FROZEN' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
              }`}>
                {frozenRules.length}
              </span>
            </button>
          </div>

          {/* Quick Filter: All vs Retard vs Absence */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrer :
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setFilterType('RETARD')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === 'RETARD'
                    ? 'bg-white text-amber-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Retards
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ABSENCE')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterType === 'ABSENCE'
                    ? 'bg-white text-rose-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Absences
              </button>
            </div>
          </div>
        </div>

        {/* Tab info text */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>
            {activeTab === 'ACTIVE' 
              ? `Barèmes actifs déclenchant des retenues financières dès l'atteinte des seuils non justifiés (${displayedRules.length} affiché(s)).`
              : `Sanctions gelées : ces règles sont désactivées, ne s'appliquent plus et n'imputent aucune retenue (${displayedRules.length} affiché(s)).`}
          </p>
          {activeTab === 'FROZEN' && (
            <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
              <Snowflake className="w-3 h-3" /> Les sanctions gelées peuvent être dégelées à tout moment
            </span>
          )}
        </div>

        {/* CARDS GRID OF THE RULES */}
        {displayedRules.length === 0 ? (
          <div className="py-14 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              {activeTab === 'ACTIVE' ? <Banknote className="w-6 h-6" /> : <Snowflake className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700">
                {activeTab === 'ACTIVE' ? 'Aucun barème actif trouvé.' : 'Aucune sanction gelée pour le moment.'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'ACTIVE' 
                  ? 'Cliquez sur « + Configurer un Seuil / Retenue » pour définir une règle.' 
                  : 'Lorsqu\'une sanction est gelée dans la liste active, elle apparaît ici pour être réactivée si besoin.'}
              </p>
            </div>
            {activeTab === 'ACTIVE' && canCreate && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Créer un barème
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRules.map(rule => (
              <div 
                key={rule.id} 
                className={`p-4 rounded-2xl border text-xs space-y-3 relative overflow-hidden transition-all shadow-xs ${
                  rule.isActive 
                    ? 'bg-white border-slate-200 hover:border-purple-300' 
                    : 'bg-blue-50/40 border-blue-200'
                }`}
              >
                {/* Header of Card: Name + Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-sm text-slate-900 leading-tight block">
                      {rule.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Entrée en vigueur : {rule.effectiveDate}
                    </span>
                  </div>

                  {/* Somme Retirable Tag */}
                  {rule.deductionAmount > 0 ? (
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black whitespace-nowrap border ${
                      rule.isActive
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200 line-through'
                    }`}>
                      -{rule.deductionAmount} {rule.currency}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 whitespace-nowrap">
                      0 {rule.currency}
                    </span>
                  )}
                </div>

                {/* Badges for Target Type and Threshold */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-md font-bold ${
                    rule.targetType === 'ABSENCE' 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {rule.targetType === 'ABSENCE' ? '🚫 Absences Injustifiées' : '⏱️ Retards Injustifiés'}
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-bold">
                    {rule.targetType === 'ABSENCE' 
                      ? `Seuil : Dès ${rule.thresholdAbsenceCount || 1} absence(s)`
                      : `Seuil : Dès ${rule.thresholdLateCount} retards (${rule.thresholdLateMinutes || 0}m)`}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                  {rule.description || 'Barème statutaire de conformité salariale.'}
                </p>

                {/* Sanction Status Info */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">
                    Sanction : <b>{rule.sanctionType === 'EXCLUSION_TEMPORAIRE'
                      ? `Exclusion temporaire · ${rule.exclusionDays || 1} jour${(rule.exclusionDays || 1) > 1 ? 's' : ''}`
                      : SANCTION_LABELS[rule.sanctionType] ?? rule.sanctionType}</b>
                  </span>
                  
                  {rule.isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En vigueur
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                      <Snowflake className="w-3 h-3" />
                      Gelée (Inactive)
                    </span>
                  )}
                </div>

                {/* ACTIONS: GELER / DÉGELER / MODIFIER / SUPPRIMER */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Modify Button */}
                    {canEdit && <button
                      type="button"
                      onClick={() => handleOpenEditModal(rule)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Modifier les seuils et montants"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>}

                    {/* Delete Button */}
                    {canDelete && (confirmDeleteRuleId === rule.id ? (
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <span className="font-semibold text-rose-600">Supprimer ?</span>
                        <button type="button" onClick={() => handleDeleteRule(rule)} className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold">Oui</button>
                        <button type="button" onClick={() => setConfirmDeleteRuleId(null)} className="px-2 py-0.5 rounded-lg border border-slate-200 font-bold text-slate-600">Non</button>
                      </span>
                    ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRuleId(rule.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Supprimer ce barème"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    ))}
                  </div>

                  {/* FREEZE / UNFREEZE BUTTON AS SPECIFICALLY REQUESTED BY USER */}
                  {!canEdit ? null : rule.isActive ? (
                    <button
                      type="button"
                      onClick={() => handleFreezeRule(rule)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all active:scale-95"
                      title="Geler cette sanction pour qu'elle ne fonctionne plus et disparaisse de la liste active"
                    >
                      <Snowflake className="w-3.5 h-3.5 text-blue-600" />
                      <span>Geler la sanction</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUnfreezeRule(rule)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold transition-all shadow-xs active:scale-95"
                      title="Dégeler cette sanction pour la réactiver et la réintégrer dans la liste"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Dégeler / Réactiver</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CONFIGURE RULE: WITH DEDUCTIBLE MONEY AMOUNTS FOR LATE & ABSENCE */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4 text-xs bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-brand" />
                {editingRuleId ? 'Modifier le Barème de Seuil & Retenue' : 'Nouveau Barème de Seuil & Retenue Financière'}
              </h2>
              <button 
                onClick={() => setIsRuleModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3.5">
              {/* Target Type Selector */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Type de manquement ciblé *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl font-bold">
                  <button
                    type="button"
                    onClick={() => setRuleForm({ 
                      ...ruleForm, 
                      targetType: 'RETARD', 
                      name: editingRuleId ? ruleForm.name : 'Seuil 5 Retards Non Justifiés' 
                    })}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      ruleForm.targetType === 'RETARD'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    ⏱️ Retards Non Justifiés
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleForm({ 
                      ...ruleForm, 
                      targetType: 'ABSENCE', 
                      name: editingRuleId ? ruleForm.name : 'Seuil 1ère Absence Non Justifiée' 
                    })}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      ruleForm.targetType === 'ABSENCE'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    🚫 Absences Non Justifiées
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Intitulé du barème *</label>
                <input
                  type="text"
                  required
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-900"
                />
              </div>

              {/* Thresholds according to target */}
              {ruleForm.targetType === 'RETARD' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Seuil nombre de retards *</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={ruleForm.thresholdLateCount}
                      onChange={(e) => setRuleForm({ ...ruleForm, thresholdLateCount: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Cumul minutes minimum</label>
                    <input
                      type="number"
                      min="0"
                      value={ruleForm.thresholdLateMinutes}
                      onChange={(e) => setRuleForm({ ...ruleForm, thresholdLateMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Seuil d'absences non justifiées (journées) *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={ruleForm.thresholdAbsenceCount}
                    onChange={(e) => setRuleForm({ ...ruleForm, thresholdAbsenceCount: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">ex. 1 pour déclencher dès la 1ère absence, ou 2 pour récidive.</span>
                </div>
              )}

              {/* SOMME D'ARGENT RETIRABLE (Demande utilisateur) */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                <label className="block text-rose-900 font-bold">
                  Somme d'argent retirable / déductible *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={ruleForm.deductionAmount}
                      onChange={(e) => setRuleForm({ ...ruleForm, deductionAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 font-mono font-black text-rose-700 text-sm outline-none"
                      placeholder="Montant (ex. 15, 20, 50)"
                    />
                  </div>
                  <div>
                    <select
                      value={ruleForm.currency}
                      onChange={(e) => setRuleForm({ ...ruleForm, currency: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 font-mono font-bold text-xs outline-none"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="CDF">CDF (Francs)</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-rose-700/80">
                  Montant prélevable une fois le seuil de non-justification atteint.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Sanction statutaire associée</label>
                <select
                  value={ruleForm.sanctionType}
                  onChange={(e) => {
                    const sanctionType = e.target.value as SanctionRule['sanctionType'];
                    setRuleForm({ ...ruleForm, sanctionType, exclusionDays: sanctionType === 'EXCLUSION_TEMPORAIRE' ? (ruleForm.exclusionDays || 3) : undefined });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-slate-900"
                >
                  <option value="RETENUE_SALARIALE_PROPOSEE">Retenue Compensatoire sur Salaire</option>
                  <option value="AVERTISSEMENT_VERBAL">Avertissement Verbal (Sans retenue)</option>
                  <option value="EXCLUSION_TEMPORAIRE">Exclusion temporaire du travail (mise à pied)</option>
                </select>
                {ruleForm.sanctionType === 'EXCLUSION_TEMPORAIRE' && (
                  <div className="mt-2 p-3 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1">
                    <label htmlFor="rule-exclusion-days" className="block text-rose-900 font-bold">Durée de l'exclusion (jours ouvrables)</label>
                    <input
                      id="rule-exclusion-days"
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={ruleForm.exclusionDays ?? 3}
                      onChange={(e) => setRuleForm({ ...ruleForm, exclusionDays: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-32 px-3 py-2 rounded-xl bg-white border border-rose-300 font-mono font-bold text-xs outline-none"
                    />
                    <p className="text-[11px] text-rose-700/80">
                      L'employé est écarté du travail pendant cette durée. Une retenue n'est pas obligatoire : laissez le montant à 0.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Description & justification juridique</label>
                <textarea
                  rows={2}
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand text-white font-bold hover:bg-brand-deep shadow-xs"
                >
                  {editingRuleId ? 'Mettre à jour le Barème' : 'Enregistrer le Barème'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
