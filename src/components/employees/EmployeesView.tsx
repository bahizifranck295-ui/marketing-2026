import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Employee, AdministrativeStatus } from '../../types';
import { 
  Users, Plus, Search, Filter, Download, 
  FileText, Edit2, Trash2, Eye, Phone, Mail, Clock, Calendar, CheckCircle, ShieldAlert
} from 'lucide-react';
import { exportToExcel, generateEmployeesPdf } from '../../utils/exportUtils';

export const EmployeesView: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, departments, companySettings, attendanceRecords } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdministrativeStatus>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    matricule: `PRM-${String(employees.length + 1).padStart(3, '0')}`,
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
    zktecoBioId: String(employees.length + 1),
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

  const handleOpenAdd = () => {
    setFormData({
      matricule: `PRM-${String(employees.length + 1).padStart(3, '0')}`,
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
      zktecoBioId: String(employees.length + 1),
      statutAdministratif: 'ACTIF'
    });
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
      statutAdministratif: emp.statutAdministratif
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.matricule) {
      alert('Veuillez remplir au minimum le matricule, le nom et le prénom.');
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, formData);
    } else {
      addEmployee(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredEmployees.map(e => ({
      Matricule: e.matricule,
      'Nom & Postnom': `${e.nom} ${e.postnom} ${e.prenom}`,
      Département: e.departement,
      Poste: e.poste,
      'Date Embauche': e.dateEmbauche,
      'Entrée Normale': e.heureEntreeNormale,
      'Sortie Normale': e.heureSortieNormale,
      'Tolérance (min)': e.toleranceMinutes,
      'ID ZKTeco': e.zktecoBioId,
      Téléphone: e.telephone,
      Email: e.email,
      'Statut Dossier': e.statutAdministratif
    }));
    exportToExcel(data, `Employes_PREMIDIS_${new Date().toISOString().substring(0, 10)}`);
  };

  const handleExportPdf = () => {
    generateEmployeesPdf(filteredEmployees, companySettings);
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
          <h1 className="text-2xl font-black text-ink dark:text-white tracking-tight flex items-center gap-2">
            Registre du Personnel
          </h1>
          <p className="text-xs text-muted dark:text-gray-400 mt-1">
            Gestion des fiches individuelles, horaires contractuels et correspondances biométriques ZKTeco
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand text-white hover:bg-brand-deep text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvel Employé</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium outline-none cursor-pointer border border-gray-200 dark:border-gray-700"
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
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium outline-none cursor-pointer border border-gray-200 dark:border-gray-700"
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
              className="w-56 sm:w-72 pl-8 pr-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 outline-none border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-brand"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="text-gray-500 font-medium">
          {filteredEmployees.length} employés trouvés
        </div>
      </div>

      {/* Employees Table */}
      <div className="glass-card rounded-2xl p-5">
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-muted dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
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
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Aucun employé ne correspond aux critères.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-brand">
                      {emp.matricule}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-100 dark:from-purple-950 dark:to-indigo-950 text-brand font-bold flex items-center justify-center text-xs">
                          {emp.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-ink dark:text-white">
                            {emp.nom} {emp.postnom} {emp.prenom}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {emp.telephone || emp.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-gray-600 dark:text-gray-300">
                      {emp.departement}
                    </td>

                    <td className="py-3 px-3.5 text-gray-700 dark:text-gray-300">
                      {emp.poste}
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono text-gray-600 dark:text-gray-400">
                      {emp.heureEntreeNormale} - {emp.heureSortieNormale}
                      <span className="text-[10px] text-gray-400 block font-sans">
                        (±{emp.toleranceMinutes} min)
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono font-semibold text-gray-700 dark:text-gray-300">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                        #{emp.zktecoBioId}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.statutAdministratif === 'ACTIF' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : emp.statutAdministratif === 'SUSPENDU'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {emp.statutAdministratif}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Voir profil & historique complet"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Modifier le dossier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Confirmez-vous la suppression de l'employé ${emp.nom} ${emp.prenom} ?`)) {
                              deleteEmployee(emp.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Supprimer l'employé"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingEmployee ? `Modifier la fiche employé : ${editingEmployee.matricule}` : 'Ajouter un Nouvel Employé'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Matricule unique *</label>
                  <input
                    type="text"
                    required
                    value={formData.matricule}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">ID Machine ZKTeco *</label>
                  <input
                    type="text"
                    required
                    value={formData.zktecoBioId}
                    onChange={(e) => setFormData({ ...formData, zktecoBioId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none font-mono"
                    placeholder="ex. 101"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Statut administratif</label>
                  <select
                    value={formData.statutAdministratif}
                    onChange={(e) => setFormData({ ...formData, statutAdministratif: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none"
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
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Postnom</label>
                  <input
                    type="text"
                    value={formData.postnom}
                    onChange={(e) => setFormData({ ...formData, postnom: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none"
                  />
                </div>
              </div>

              {/* Department & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Département *</label>
                  <select
                    value={formData.departement}
                    onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Poste / Fonction *</label>
                  <input
                    type="text"
                    required
                    value={formData.poste}
                    onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none"
                    placeholder="ex. Opérateur de Ligne"
                  />
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none font-mono"
                    placeholder="+243 ..."
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 font-bold mb-1">Email professionnel</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none"
                    placeholder="nom@premidis.cd"
                  />
                </div>
              </div>

              {/* Schedules & Tolerances */}
              <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
                <p className="font-bold text-brand text-xs">
                  Horaires Contractuels & Règle de Retard
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">Entrée normale (HH:mm)</label>
                    <input
                      type="time"
                      value={formData.heureEntreeNormale}
                      onChange={(e) => setFormData({ ...formData, heureEntreeNormale: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">Sortie normale (HH:mm)</label>
                    <input
                      type="time"
                      value={formData.heureSortieNormale}
                      onChange={(e) => setFormData({ ...formData, heureSortieNormale: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 dark:text-gray-400 font-semibold mb-1">Tolérance de retard (min)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={formData.toleranceMinutes}
                      onChange={(e) => setFormData({ ...formData, toleranceMinutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200"
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
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand to-neon text-white flex items-center justify-center text-lg font-black shadow-sm">
                  {selectedEmployee.nom.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {selectedEmployee.nom} {selectedEmployee.postnom} {selectedEmployee.prenom}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedEmployee.poste} · {selectedEmployee.departement}
                  </p>
                  <span className="inline-block mt-1 font-mono font-bold text-xs text-brand bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                    Matricule : {selectedEmployee.matricule}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <span className="text-lg font-black text-emerald-600 block">
                  {employeeHistory.filter(r => r.status === 'PRESENT').length}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Présences (P)</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <span className="text-lg font-black text-amber-600 block">
                  {employeeHistory.filter(r => r.status === 'RETARD').length}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Retards (R)</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <span className="text-lg font-black text-rose-600 block">
                  {employeeHistory.filter(r => r.status === 'ABSENT').length}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">Absences (A)</span>
              </div>
            </div>

            {/* Contractual parameters */}
            <div className="text-xs space-y-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <p className="flex justify-between">
                <span className="text-gray-500">Heure normale d'entrée :</span>
                <span className="font-mono font-bold">{selectedEmployee.heureEntreeNormale}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Heure normale de sortie :</span>
                <span className="font-mono font-bold">{selectedEmployee.heureSortieNormale}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Tolérance accordée :</span>
                <span className="font-mono font-bold">{selectedEmployee.toleranceMinutes} minutes</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">ID de pointage ZKTeco :</span>
                <span className="font-mono font-bold">#{selectedEmployee.zktecoBioId}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Date d'embauche :</span>
                <span className="font-mono font-bold">{selectedEmployee.dateEmbauche}</span>
              </p>
            </div>

            {/* Attendance History */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Historique des Derniers Pointages
              </h3>
              <div className="overflow-x-auto max-h-48 rounded-xl border border-gray-100 dark:border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 font-bold text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-center">Entrée</th>
                      <th className="py-2 px-3 text-center">Retard</th>
                      <th className="py-2 px-3 text-center">Sortie</th>
                      <th className="py-2 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                    {employeeHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">
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
                className="px-4 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold"
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
