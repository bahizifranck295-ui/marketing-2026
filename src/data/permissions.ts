import { AppModule, ModulePermissions, PermissionAction, RoleDefinition } from '../types';

export const APP_MODULES: { id: AppModule; label: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'employees', label: 'Employés' },
  { id: 'attendance', label: 'Présences' },
  { id: 'reports', label: 'Rapports & Documents' },
  { id: 'sanctions', label: 'Retards & Sanctions' },
  { id: 'settings', label: 'Paramètres' },
];

export const PERMISSION_ACTIONS: { id: PermissionAction; label: string }[] = [
  { id: 'view', label: 'Consulter' },
  { id: 'create', label: 'Créer' },
  { id: 'edit', label: 'Modifier' },
  { id: 'delete', label: 'Supprimer' },
  { id: 'export', label: 'Exporter' },
  { id: 'validate', label: 'Valider' },
];

const ALL: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export', 'validate'];

export const fullPermissions = (): ModulePermissions => ({
  dashboard: [...ALL],
  employees: [...ALL],
  attendance: [...ALL],
  reports: [...ALL],
  sanctions: [...ALL],
  settings: [...ALL],
});

export const emptyPermissions = (): ModulePermissions => ({
  dashboard: ['view'],
  employees: [],
  attendance: [],
  reports: [],
  sanctions: [],
  settings: [],
});

export const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: 'ADMIN',
    label: 'Administrateur',
    description: 'Accès complet à tous les modules, gestion des comptes et des rôles.',
    permissions: fullPermissions(),
    system: true,
  },
  {
    id: 'DIRECTEUR',
    label: 'Directeur',
    description: 'Consulte tout, exporte les rapports et valide les sanctions.',
    permissions: {
      dashboard: ['view', 'export'],
      employees: ['view', 'export'],
      attendance: ['view', 'export'],
      reports: ['view', 'export'],
      sanctions: ['view', 'export', 'validate'],
      settings: ['view'],
    },
    system: true,
  },
  {
    id: 'RH',
    label: 'Responsable RH',
    description: 'Gère les employés, corrige les pointages et prépare les sanctions.',
    permissions: {
      dashboard: ['view', 'export'],
      employees: ['view', 'create', 'edit', 'delete', 'export'],
      attendance: ['view', 'create', 'edit', 'export'],
      reports: ['view', 'export'],
      sanctions: ['view', 'create', 'edit', 'export'],
      settings: ['view'],
    },
    system: true,
  },
  {
    id: 'SECRETAIRE',
    label: 'Secrétaire',
    description: 'Enregistre les pointages et consulte le registre du jour.',
    permissions: {
      dashboard: ['view'],
      employees: ['view'],
      attendance: ['view', 'create', 'export'],
      reports: ['view'],
      sanctions: [],
      settings: [],
    },
    system: true,
  },
];
