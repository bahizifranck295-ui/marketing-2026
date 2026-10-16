import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { EmployeeAvatar, resizePhoto } from '../common/EmployeeAvatar';
import { Employee, AdministrativeStatus } from '../../types';
import { Plus, Search, FileText, Edit2, Trash2, Eye, Camera } from 'lucide-react';
import { generateEmployeesPdf } from '../../utils/pdfLoader';

export const EmployeesView: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, departments, companySettings, attendanceRecords, can } = useApp();
  const canCreate = can('employees', 'create');
  const canEdit = can('employees', 'edit');
  const canDelete = can('employees', 'delete');
  const canExport = can('employees', 'export');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Prochain matricule et prochain ID pointeuse libres (jamais celui d'un employé existant, même après suppression)
  const nextNumber = (values: string[]) => values.reduce((max, v) => Math.max(max, parseInt(v.replace(/\D/g, ''), 10) || 0), 0) + 1;
  const nextMatricule = () => `PRM-${String(nextNumber(employees.map(e => e.matricule))).padStart(3, '0')}`;
  const nextBioId = () => String(nextNumber(employees.map(e => e.zktecoBioId)));

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdministrativeStatus>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    matricule: '',
    nom: '',
    postnom: '',
    prenom: '',
    departement: departments[0]?.name || 'Production & Usine',
    poste: '',
    email: '',
    telephone: '',
    dateEmbauche: new Date().toISOString().substring(0, 10),
    heureEntreeNormale: '08:30',
    heureSortieNormale: '16:30',
    toleranceMinutes: 10,
    zktecoBioId: '',
    statutAdministratif: 'ACTIF'
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchDep = departmentFilter === 'ALL' || emp.departement === departmentFilter;
      const matchStatus = statusFilter === 'ALL' || emp.statutAdministratif === statusFilter;
      const matchSearch = searchQuery === '' ||
        `${emp.nom} ${emp.postnom} ${emp.prenom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.matricule.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.poste.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDep && matchStatus && matchSearch;
    });
  }, [employees, departmentFilter, statusFilter, searchQuery]);

  const [photoError, setPhotoError] = useState('');
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoError('Choisissez une image (JPG, PNG…).'); return; }
    try {
      const photoUrl = await resizePhoto(file);
      setFormData(f => ({ ...f, photoUrl }));
      setPhotoError('');
    } catch (err: any) {
      setPhotoError(err?.message || 'Photo illisible.');
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      matricule: nextMatricule(),
      nom: '',
      postnom: '',
      prenom: '',
      departement: departments[0]?.name || 'Production & Usine',
      poste: '',
      email: '',
      telephone: '',
      dateEmbauche: new Date().toISOString().substring(0, 10),
      heureEntreeNormale: companySettings.defaultExpectedCheckIn,
      heureSortieNormale: companySettings.defaultExpectedCheckOut,
      toleranceMinutes: companySettings.defaultToleranceMinutes,
      zktecoBioId: nextBioId(),
      statutAdministratif: 'ACTIF',
      photoUrl: undefined
    });
    setPhotoError('');
    setFormError('');
    setEditingEmployee(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      matricule: emp.matricule,
      nom: emp.nom,
      postnom: emp.postnom,
      prenom: emp.prenom,
      departement: emp.departement,
      poste: emp.poste,
      email: emp.email,
      telephone: emp.telephone,
      dateEmbauche: emp.dateEmbauche,
      heureEntreeNormale: emp.heureEntreeNormale,
      heureSortieNormale: emp.heureSortieNormale,
      toleranceMinutes: emp.toleranceMinutes,
      zktecoBioId: emp.zktecoBioId,
      statutAdministratif: emp.statutAdministratif,
      photoUrl: emp.photoUrl
    });
    setPhotoError('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matricule = formData.matricule.trim().toUpperCase();
    const bioId = formData.zktecoBioId.trim();
    if (!formData.nom.trim() || !formData.prenom.trim() || !matricule) {
      setFormError('Veuillez remplir au minimum le matricule, le nom et le prénom.');
      return;
    }
    // Un matricule et un ID pointeuse ne désignent qu'un seul employé : sinon les pointages seraient mélangés
    const others = employees.filter(e => e.id !== editingEmployee?.id);
    const sameMatricule = others.find(e => e.matricule.toUpperCase() === matricule);
    if (sameMatricule) {
      setFormError(`Le matricule ${matricule} est déjà attribué à ${sameMatricule.nom} ${sameMatricule.prenom}.`);
      return;
    }
    const norm = (id: string) => id.replace(/^0+(?=\d)/, '');
    const sameBioId = bioId ? others.find(e => norm(e.zktecoBioId.trim()) === norm(bioId)) : undefined;
    if (sameBioId) {
      setFormError(`L'ID pointeuse ${bioId} est déjà attribué à ${sameBioId.nom} ${sameBioId.prenom}.`);
      return;
    }
    const data = { ...formData, matricule, zktecoBioId: bioId };

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, data);
    } else {
      addEmployee(data);
    }
    setIsAddModalOpen(false);
  };

  const handleExportPdf = () => {
    generateEmployeesPdf(filteredEmployees);
  };

  // Get selected employee's attendance stats
  const employeeHistory = useMemo(() => {
    if (!selectedEmployee) return [];
    return attendanceRecords.filter(r => r.employeeId === selectedEmployee.matricule);
  }, [selectedEmployee, attendanceRecords]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Registre du Personnel
          </h1>
          <p className="text-xs text-muted mt-1">
            Gestion des fiches individuelles, horaires contractuels et correspondances biométriques ZKTeco
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canExport && <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>}


          {canCreate && <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-white hover:bg-brand-deep text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvel Employé</span>
          </button>}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-medium outline-none cursor-pointer border border-slate-200"
          >
            <option value="ALL">Tous les départements</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-medium outline-none cursor-pointer border border-slate-200"
          >
            <option value="ALL">Tous statuts administratifs</option>
            <option value="ACTIF">Actif</option>
            <option value="INACTIF">Inactif</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher nom, poste, matricule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 sm:w-72 pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 text-slate-900 placeholder-slate-400 outline-none border border-slate-200 focus:ring-1 focus:ring-brand"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="text-slate-500 font-medium">
          {filteredEmployees.length} employés trouvés
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-card rounded-2xl p-5">
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-muted font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-3.5">Matricule</th>
                <th className="py-3 px-3.5">Employé</th>
                <th className="py-3 px-3.5">Département</th>
                <th className="py-3 px-3.5">Poste / Fonction</th>
                <th className="py-3 px-3.5 text-center">Horaires Normaux</th>
                <th className="py-3 px-3.5 text-center">ID ZKTeco</th>
                <th className="py-3 px-3.5 text-center">Statut Dossier</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucun employé ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-brand">
                      {emp.matricule}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <EmployeeAvatar name={`${emp.nom} ${emp.prenom}`} photoUrl={emp.photoUrl || ''} size={36} />
                        <div>
                          <p className="font-bold text-ink">
                            {emp.nom} {emp.postnom} {emp.prenom}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {emp.telephone || emp.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-slate-600">
                      {emp.departement}
                    </td>

                    <td className="py-3 px-3.5 text-slate-700">
                      {emp.poste}
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono text-slate-600">
                      {emp.heureEntreeNormale} - {emp.heureSortieNormale}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        (±{emp.toleranceMinutes} min)
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100">
                        #{emp.zktecoBioId}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.statutAdministratif === 'ACTIF' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : emp.statutAdministratif === 'SUSPENDU'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {emp.statutAdministratif}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand hover:bg-slate-100 transition-colors"
                          title="Voir profil & historique complet"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand hover:bg-slate-100 transition-colors"
                          title="Modifier le dossier"
                          aria-label={`Modifier le dossier de ${emp.nom} ${emp.prenom}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>}
                        {canDelete && (confirmDeleteId === emp.id ? (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <span className="font-semibold text-rose-600">Supprimer ?</span>
                            <button onClick={() => { deleteEmployee(emp.id); setConfirmDeleteId(null); }} className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold">Oui</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 rounded-lg border border-slate-200 font-bold text-slate-600">Non</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(emp.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Supprimer l'employé"
                            aria-label={`Supprimer ${emp.nom} ${emp.prenom}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT EMPLOYEE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingEmployee ? `Modifier la fiche employé : ${editingEmployee.matricule}` : 'Ajouter un Nouvel Employé'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Photo de l'employé : affichée partout où son nom apparaît */}
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-slate-200 bg-slate-50">
                <EmployeeAvatar name={`${formData.nom} ${formData.prenom}`} photoUrl={formData.photoUrl || ''} size={72} rounded="xl" />
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700">Photo de l'employé</p>
                  <div className="flex flex-wrap gap-2">
                    <label htmlFor="emp-photo" className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand text-white font-semibold hover:bg-brand-strong">
                      <Camera className="w-3.5 h-3.5" /> {formData.photoUrl ? 'Changer la photo' : 'Importer une photo'}
                    </label>
                    <input id="emp-photo" type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                    {formData.photoUrl && (
                      <button type="button" onClick={() => setFormData(f => ({ ...f, photoUrl: undefined }))} className="px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-100">
                        Retirer
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">JPG ou PNG, recadrée en carré automatiquement.</p>
                  {photoError && <p className="text-[11px] font-semibold text-red-600">{photoError}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Matricule unique *</label>
                  <input
                    type="text"
                    required
                    value={formData.matricule}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">ID Machine ZKTeco *</label>
                  <input
                    type="text"
                    required
                    value={formData.zktecoBioId}
                    onChange={(e) => setFormData({ ...formData, zktecoBioId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono"
                    placeholder="ex. 101"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Statut administratif</label>
                  <select
                    value={formData.statutAdministratif}
                    onChange={(e) => setFormData({ ...formData, statutAdministratif: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none"
                  >
                    <option value="ACTIF">Actif</option>
                    <option value="INACTIF">Inactif</option>
                    <option value="SUSPENDU">Suspendu</option>
                  </select>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Postnom</label>
                  <input
                    type="text"
                    value={formData.postnom}
                    onChange={(e) => setFormData({ ...formData, postnom: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Department & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Département *</label>
                  <select
                    value={formData.departement}
                    onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Poste / Fonction *</label>
                  <input
                    type="text"
                    required
                    value={formData.poste}
                    onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none"
                    placeholder="ex. Opérateur de Ligne"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono"
                    placeholder="+243 ..."
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Email professionnel</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none"
                    placeholder="nom@premidis.cd"
                  />
                </div>
              </div>

              {/* Schedules & Tolerances */}
              <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
                <p className="font-bold text-brand text-xs">
                  Horaires Contractuels & Règle de Retard
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Entrée normale (HH:mm)</label>
                    <input
                      type="time"
                      value={formData.heureEntreeNormale}
                      onChange={(e) => setFormData({ ...formData, heureEntreeNormale: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Sortie normale (HH:mm)</label>
                    <input
                      type="time"
                      value={formData.heureSortieNormale}
                      onChange={(e) => setFormData({ ...formData, heureSortieNormale: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tolérance de retard (min)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.toleranceMinutes}
                      onChange={(e) => setFormData({ ...formData, toleranceMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {formError && <p className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold" role="alert">{formError}</p>}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand text-white font-bold hover:bg-brand-deep shadow-sm"
                >
                  {editingEmployee ? 'Mettre à jour' : 'Enregistrer l\'employé'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL 2: VIEW EMPLOYEE PROFILE & ATTENDANCE HISTORY */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <EmployeeAvatar name={`${selectedEmployee.nom} ${selectedEmployee.prenom}`} photoUrl={selectedEmployee.photoUrl || ''} size={64} rounded="xl" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedEmployee.nom} {selectedEmployee.postnom} {selectedEmployee.prenom}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedEmployee.poste} · {selectedEmployee.departement}
                  </p>
                  <span className="inline-block mt-1 font-mono font-bold text-xs text-brand bg-purple-50 px-2 py-0.5 rounded">
                    Matricule : {selectedEmployee.matricule}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg font-black text-emerald-600 block">
                  {employeeHistory.filter(r => r.status === 'PRESENT').length}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Présences (P)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg font-black text-amber-600 block">
                  {employeeHistory.filter(r => r.status === 'RETARD').length}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Retards (R)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg font-black text-rose-600 block">
                  {employeeHistory.filter(r => r.status === 'ABSENT').length}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Absences (A)</span>
              </div>
            </div>

            {/* Contractual parameters */}
            <div className="text-xs space-y-1.5 p-3 rounded-xl bg-slate-50">
              <p className="flex justify-between">
                <span className="text-slate-500">Heure normale d'entrée :</span>
                <span className="font-mono font-bold">{selectedEmployee.heureEntreeNormale}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Heure normale de sortie :</span>
                <span className="font-mono font-bold">{selectedEmployee.heureSortieNormale}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Tolérance accordée :</span>
                <span className="font-mono font-bold">{selectedEmployee.toleranceMinutes} minutes</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">ID de pointage ZKTeco :</span>
                <span className="font-mono font-bold">#{selectedEmployee.zktecoBioId}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Date d'embauche :</span>
                <span className="font-mono font-bold">{selectedEmployee.dateEmbauche}</span>
              </p>
            </div>

            {/* Attendance History */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Historique des Derniers Pointages
              </h3>
              <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-center">Entrée</th>
                      <th className="py-2 px-3 text-center">Retard</th>
                      <th className="py-2 px-3 text-center">Sortie</th>
                      <th className="py-2 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {employeeHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Aucun historique disponible.
                        </td>
                      </tr>
                    ) : (
                      employeeHistory.map((h) => (
                        <tr key={h.id}>
                          <td className="py-2 px-3 font-mono">{h.date}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold">{h.actualCheckIn || '–'}</td>
                          <td className="py-2 px-3 text-center font-mono text-amber-600">
                            {h.lateMinutes > 0 ? `+${h.lateMinutes} min` : '0'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono">{h.actualCheckOut || '–'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                              h.status === 'RETARD' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {h.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
