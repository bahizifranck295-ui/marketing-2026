import { Employee, Department, AttendanceRecord, ZKTecoDeviceConfig, SanctionRule, SanctionCase, User, CompanySettings, AuditLog } from '../types';

export const INITIAL_COMPANY_SETTINGS: CompanySettings = {
  companyName: "PREMIDIS SARL",
  companySubName: "Société à Responsabilité Limitée – Production & Distribution",
  address: "Route Aéroport N°20, Q/Bujovu, Commune de Karisimbi, Ville de Goma, Nord-Kivu, R.D. Congo",
  rccm: "CD/GOM/RCCM/14-B-0203",
  phone: "+243 965 538 258",
  whatsapp: "+243 910 042 575",
  email: "breezyjovial1@gmail.com",
  timezone: "Africa/Lubumbashi (CAT / GMT+2)",
  defaultExpectedCheckIn: "08:30",
  defaultExpectedCheckOut: "16:30",
  defaultToleranceMinutes: 10,
  workingDays: [1, 2, 3, 4, 5, 6], // Lundi au Samedi
  allowManualCorrections: true,
  requireCorrectionReason: true,
  currency: "USD"
};

export const INITIAL_USERS: User[] = [
  {
    id: "usr-admin",
    name: "Franck Bahizi",
    email: "admin@premidis.cd",
    role: "ADMIN",
    department: "Administration & Informatique",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "usr-sec",
    name: "Sylvie Masika",
    email: "secretaire@premidis.cd",
    role: "SECRETAIRE",
    department: "Secrétariat de Direction",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "usr-rh",
    name: "Justin Paluku",
    email: "rh@premidis.cd",
    role: "RH",
    department: "Ressources Humaines",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
  },
  {
    id: "usr-dir",
    name: "Dieudonné Kasereka",
    email: "direction@premidis.cd",
    role: "DIRECTEUR",
    department: "Direction Générale",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
  }
];

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: "dep-dir", name: "Direction Générale", code: "DIR", manager: "Dieudonné Kasereka", employeeCount: 4, defaultEntrance: "08:30", defaultExit: "16:30" },
  { id: "dep-rh", name: "Ressources Humaines", code: "RH", manager: "Justin Paluku", employeeCount: 5, defaultEntrance: "08:30", defaultExit: "16:30" },
  { id: "dep-fin", name: "Administration & Finances", code: "FIN", manager: "Marie Kavira", employeeCount: 7, defaultEntrance: "08:30", defaultExit: "16:30" },
  { id: "dep-prod", name: "Production & Usine", code: "PRD", manager: "Michel Muhindo", employeeCount: 16, defaultEntrance: "08:00", defaultExit: "16:00" },
  { id: "dep-qual", name: "Contrôle Qualité & Labo", code: "LAB", manager: "Annette Kahindo", employeeCount: 4, defaultEntrance: "08:00", defaultExit: "16:00" },
  { id: "dep-log", name: "Logistique & Magasin", code: "LOG", manager: "Serge Mbusa", employeeCount: 9, defaultEntrance: "08:30", defaultExit: "16:30" },
  { id: "dep-com", name: "Commercial & Ventes", code: "COM", manager: "Pascal Kambale", employeeCount: 6, defaultEntrance: "08:30", defaultExit: "16:30" },
  { id: "dep-tech", name: "Maintenance & Technique", code: "TEC", manager: "Guillaume Katembo", employeeCount: 5, defaultEntrance: "08:00", defaultExit: "16:00" },
  { id: "dep-sec", name: "Sécurité & Gardiennage", code: "SEC", manager: "Capitaine Baraka", employeeCount: 6, defaultEntrance: "07:30", defaultExit: "16:00" }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  // Direction & RH
  {
    id: "emp-1",
    matricule: "PRM-001",
    nom: "KASEREKA",
    postnom: "VAGHENI",
    prenom: "Dieudonné",
    departement: "Direction Générale",
    poste: "Directeur Général",
    email: "d.kasereka@premidis.cd",
    telephone: "+243 971 112 001",
    dateEmbauche: "2015-03-01",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "1",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-2",
    matricule: "PRM-002",
    nom: "MASIKA",
    postnom: "KASOKI",
    prenom: "Sylvie",
    departement: "Direction Générale",
    poste: "Secrétaire de Direction",
    email: "s.masika@premidis.cd",
    telephone: "+243 998 223 102",
    dateEmbauche: "2018-06-15",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "2",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-3",
    matricule: "PRM-003",
    nom: "PALUKU",
    postnom: "KITSA",
    prenom: "Justin",
    departement: "Ressources Humaines",
    poste: "Chef de Département RH",
    email: "j.paluku@premidis.cd",
    telephone: "+243 997 445 203",
    dateEmbauche: "2017-02-10",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "3",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-4",
    matricule: "PRM-004",
    nom: "BAHIZI",
    postnom: "SHABANI",
    prenom: "Franck",
    departement: "Ressources Humaines",
    poste: "Chargé du Personnel & Pointage",
    email: "f.bahizi@premidis.cd",
    telephone: "+243 965 538 258",
    dateEmbauche: "2019-09-01",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "4",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-5",
    matricule: "PRM-005",
    nom: "KAVIRA",
    postnom: "MUHASA",
    prenom: "Marie",
    departement: "Administration & Finances",
    poste: "Directrice Financière & Comptable",
    email: "m.kavira@premidis.cd",
    telephone: "+243 994 331 405",
    dateEmbauche: "2016-04-12",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "5",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-6",
    matricule: "PRM-006",
    nom: "KAMBALE",
    postnom: "MUTSUVA",
    prenom: "Alain",
    departement: "Administration & Finances",
    poste: "Comptable Trésorier",
    email: "a.kambale@premidis.cd",
    telephone: "+243 991 778 506",
    dateEmbauche: "2020-01-15",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "6",
    statutAdministratif: "ACTIF"
  },
  // Production Usine
  {
    id: "emp-7",
    matricule: "PRM-007",
    nom: "MUHINDO",
    postnom: "BWANA",
    prenom: "Michel",
    departement: "Production & Usine",
    poste: "Chef d'Usine & Production",
    email: "m.muhindo@premidis.cd",
    telephone: "+243 992 443 607",
    dateEmbauche: "2016-08-01",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "7",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-8",
    matricule: "PRM-008",
    nom: "KATEMBO",
    postnom: "SIKULISIMA",
    prenom: "Jonas",
    departement: "Production & Usine",
    poste: "Superviseur Ligne d'Embouteillage",
    email: "j.katembo@premidis.cd",
    telephone: "+243 993 556 708",
    dateEmbauche: "2018-11-20",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "8",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-9",
    matricule: "PRM-009",
    nom: "MBUSA",
    postnom: "NZANZU",
    prenom: "Serge",
    departement: "Logistique & Magasin",
    poste: "Responsable Magasin & Dépôt",
    email: "s.mbusa@premidis.cd",
    telephone: "+243 995 667 809",
    dateEmbauche: "2017-05-18",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "9",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-10",
    matricule: "PRM-010",
    nom: "KAHINDO",
    postnom: "TSHONGO",
    prenom: "Annette",
    departement: "Contrôle Qualité & Labo",
    poste: "Responsable Laboratoire & Qualité",
    email: "a.kahindo@premidis.cd",
    telephone: "+243 990 889 910",
    dateEmbauche: "2019-03-10",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "10",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-11",
    matricule: "PRM-011",
    nom: "KAKULE",
    postnom: "KASIVIKA",
    prenom: "Pascal",
    departement: "Commercial & Ventes",
    poste: "Chef des Ventes Goma & Région",
    email: "p.kakule@premidis.cd",
    telephone: "+243 991 223 011",
    dateEmbauche: "2018-07-01",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "11",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-12",
    matricule: "PRM-012",
    nom: "BARAKA",
    postnom: "MUGISHA",
    prenom: "Jean-Paul",
    departement: "Sécurité & Gardiennage",
    poste: "Chef de Poste Sécurité",
    email: "j.baraka@premidis.cd",
    telephone: "+243 999 111 212",
    dateEmbauche: "2016-01-10",
    heureEntreeNormale: "07:30",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "12",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-13",
    matricule: "PRM-013",
    nom: "KYAKIMWA",
    postnom: "VULAMBO",
    prenom: "Clarisse",
    departement: "Administration & Finances",
    poste: "Caissière Principale",
    email: "c.kyakimwa@premidis.cd",
    telephone: "+243 997 334 513",
    dateEmbauche: "2021-02-01",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "13",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-14",
    matricule: "PRM-014",
    nom: "MUMBERE",
    postnom: "KIVALYA",
    prenom: "Erick",
    departement: "Production & Usine",
    poste: "Opérateur Cuves de Brassage",
    email: "e.mumbere@premidis.cd",
    telephone: "+243 996 445 614",
    dateEmbauche: "2020-05-12",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "14",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-15",
    matricule: "PRM-015",
    nom: "KASOKI",
    postnom: "MUSAVULI",
    prenom: "Gentille",
    departement: "Production & Usine",
    poste: "Opératrice Conditionnement",
    email: "g.kasoki@premidis.cd",
    telephone: "+243 995 556 715",
    dateEmbauche: "2021-08-19",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "15",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-16",
    matricule: "PRM-016",
    nom: "NZANZU",
    postnom: "KALONDERO",
    prenom: "Fabrice",
    departement: "Maintenance & Technique",
    poste: "Technicien Électromécanicien",
    email: "f.nzanzu@premidis.cd",
    telephone: "+243 994 667 816",
    dateEmbauche: "2019-11-04",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "16",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-17",
    matricule: "PRM-017",
    nom: "PALUKU",
    postnom: "NGURAMO",
    prenom: "Jacques",
    departement: "Logistique & Magasin",
    poste: "Chauffeur Poids Lourd Distribution",
    email: "j.nguramo@premidis.cd",
    telephone: "+243 993 778 917",
    dateEmbauche: "2017-09-15",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "17",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-18",
    matricule: "PRM-018",
    nom: "KAVIRA",
    postnom: "SIWAKO",
    prenom: "Francine",
    departement: "Commercial & Ventes",
    poste: "Déléguée Commerciale Bujovu & Majengo",
    email: "f.siwako@premidis.cd",
    telephone: "+243 992 889 018",
    dateEmbauche: "2022-03-01",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "18",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-19",
    matricule: "PRM-019",
    nom: "KAMBALE",
    postnom: "VALYALYA",
    prenom: "Clovis",
    departement: "Production & Usine",
    poste: "Manutentionnaire Chargement",
    email: "c.kambale@premidis.cd",
    telephone: "+243 991 990 119",
    dateEmbauche: "2022-07-10",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "19",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-20",
    matricule: "PRM-020",
    nom: "MUHINDO",
    postnom: "KANYERE",
    prenom: "Rachel",
    departement: "Contrôle Qualité & Labo",
    poste: "Technicienne Microbiologie",
    email: "r.muhindo@premidis.cd",
    telephone: "+243 990 112 320",
    dateEmbauche: "2021-10-15",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "20",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-21",
    matricule: "PRM-021",
    nom: "KATSUVA",
    postnom: "MALIKIDOGO",
    prenom: "Benoît",
    departement: "Sécurité & Gardiennage",
    poste: "Agent de Contrôle Entrée Barrière",
    email: "b.katsuva@premidis.cd",
    telephone: "+243 999 223 421",
    dateEmbauche: "2018-04-05",
    heureEntreeNormale: "07:30",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "21",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-22",
    matricule: "PRM-022",
    nom: "KASEREKA",
    postnom: "MUTIPI",
    prenom: "Christian",
    departement: "Logistique & Magasin",
    poste: "Aide-Magasinier & Réception",
    email: "c.mutipi@premidis.cd",
    telephone: "+243 998 334 522",
    dateEmbauche: "2023-01-16",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "22",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-23",
    matricule: "PRM-023",
    nom: "MASIKA",
    postnom: "MUVUGHE",
    prenom: "Espérance",
    departement: "Ressources Humaines",
    poste: "Assistante Sociale & Infirmerie Usine",
    email: "e.masika@premidis.cd",
    telephone: "+243 997 445 623",
    dateEmbauche: "2020-09-01",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "23",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-24",
    matricule: "PRM-024",
    nom: "MBUSA",
    postnom: "KALIMIRWA",
    prenom: "Daniel",
    departement: "Maintenance & Technique",
    poste: "Électricien Industriel Ligne",
    email: "d.mbusa@premidis.cd",
    telephone: "+243 996 556 724",
    dateEmbauche: "2019-06-25",
    heureEntreeNormale: "08:00",
    heureSortieNormale: "16:00",
    toleranceMinutes: 10,
    zktecoBioId: "24",
    statutAdministratif: "ACTIF"
  },
  {
    id: "emp-25",
    matricule: "PRM-025",
    nom: "KAVIRA",
    postnom: "SIVIHWA",
    prenom: "Nathalie",
    departement: "Commercial & Ventes",
    poste: "Facturière Ventes Comptoir",
    email: "n.sivihwa@premidis.cd",
    telephone: "+243 995 667 825",
    dateEmbauche: "2022-11-01",
    heureEntreeNormale: "08:30",
    heureSortieNormale: "16:30",
    toleranceMinutes: 10,
    zktecoBioId: "25",
    statutAdministratif: "ACTIF"
  }
];

// Helper to generate attendance for a set of dates
export function generateMockAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const employees = INITIAL_EMPLOYEES;
  
  // Dates in October 2026: 2026-10-01 to 2026-10-11
  const dates = [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-10',
    '2026-10-11' // Today
  ];

  // Specific repeat-late patterns for testing sanctions
  // PRM-017 (Jacques) has multiple lates (threshold reached)
  // PRM-019 (Clovis) has lates
  // PRM-014 (Erick) has lates
  
  dates.forEach((date, dateIdx) => {
    employees.forEach((emp) => {
      const isToday = (date === '2026-10-11');
      let status: 'PRESENT' | 'RETARD' | 'ABSENT' = 'PRESENT';
      let actualCheckIn: string | null = null;
      let lateMinutes = 0;
      let actualCheckOut: string | null = null;
      let earlyDepartureMinutes = 0;
      let notes = '';

      const expectedIn = emp.heureEntreeNormale;
      const [expH, expM] = expectedIn.split(':').map(Number);
      const expectedOut = emp.heureSortieNormale;

      // Seed behavior per employee
      const hash = (emp.matricule.charCodeAt(4) * 17 + dateIdx * 31) % 100;

      if (emp.matricule === 'PRM-017') {
        // Jacques Paluku (late frequently: on dates 01, 03, 07, 09, 11)
        if ([0, 2, 5, 7, 9].includes(dateIdx)) {
          status = 'RETARD';
          const late = 15 + ((dateIdx * 7) % 25);
          lateMinutes = late;
          const min = expM + late;
          const h = expH + Math.floor(min / 60);
          const m = min % 60;
          actualCheckIn = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          actualCheckOut = '16:35';
          notes = 'Embouteillage rond-point BDGL';
        } else {
          status = 'PRESENT';
          actualCheckIn = `${String(expH).padStart(2, '0')}:${String(expM - 5).padStart(2, '0')}`;
          actualCheckOut = '16:32';
        }
      } else if (emp.matricule === 'PRM-019') {
        // Clovis Kambale (late on dates 02, 06, 08, 11)
        if ([1, 4, 6, 9].includes(dateIdx)) {
          status = 'RETARD';
          lateMinutes = 22;
          actualCheckIn = `${String(expH).padStart(2, '0')}:${String(expM + 22).padStart(2, '0')}`;
          actualCheckOut = '16:02';
        } else {
          status = 'PRESENT';
          actualCheckIn = `${String(expH).padStart(2, '0')}:${String(expM - 4).padStart(2, '0')}`;
          actualCheckOut = '16:05';
        }
      } else if (emp.matricule === 'PRM-008') {
        // Jonas Katembo (absent on 06, 07)
        if ([4, 5].includes(dateIdx)) {
          status = 'ABSENT';
          actualCheckIn = null;
          actualCheckOut = null;
          notes = 'Non présenté (Avis médical en attente)';
        } else {
          status = 'PRESENT';
          actualCheckIn = '07:55';
          actualCheckOut = '16:05';
        }
      } else if (emp.matricule === 'PRM-014' && dateIdx === 9) {
        // Erick on today is late
        status = 'RETARD';
        lateMinutes = 35;
        actualCheckIn = '08:35';
        actualCheckOut = null; // Still working today
        notes = 'Arrivé 35 min après heure prévue';
      } else if (emp.matricule === 'PRM-022' && dateIdx === 8) {
        // Christian absent yesterday
        status = 'ABSENT';
        actualCheckIn = null;
        actualCheckOut = null;
        notes = 'Absence constatée';
      } else {
        // Normal distribution
        if (hash < 82) {
          // PRESENT
          status = 'PRESENT';
          const offset = ((hash % 15) - 10); // -10 to +4 mins from expected
          const totalM = expH * 60 + expM + offset;
          const h = Math.floor(totalM / 60);
          const m = totalM % 60;
          actualCheckIn = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          actualCheckOut = isToday ? (hash % 2 === 0 ? '16:35' : null) : '16:32';
        } else if (hash < 93) {
          // RETARD
          status = 'RETARD';
          const late = 12 + (hash % 20); // 12 to 31 min late
          lateMinutes = late;
          const totalM = expH * 60 + expM + late;
          const h = Math.floor(totalM / 60);
          const m = totalM % 60;
          actualCheckIn = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          actualCheckOut = isToday ? null : '16:30';
          notes = 'Pointé après heure limite';
        } else {
          // ABSENT
          status = 'ABSENT';
          actualCheckIn = null;
          actualCheckOut = null;
          notes = 'Absence non justifiée';
        }
      }

      records.push({
        id: `att-${emp.matricule}-${date}`,
        employeeId: emp.matricule,
        employeeName: `${emp.nom} ${emp.postnom} ${emp.prenom}`,
        department: emp.departement,
        date,
        expectedCheckIn: expectedIn,
        actualCheckIn,
        lateMinutes,
        expectedCheckOut: expectedOut,
        actualCheckOut,
        earlyDepartureMinutes,
        status, // Strictly PRESENT | RETARD | ABSENT
        source: 'ZKTECO_BIOMETRIC',
        notes,
        rawPunchInTime: actualCheckIn ? `${date} ${actualCheckIn}:14` : null,
        rawPunchOutTime: actualCheckOut ? `${date} ${actualCheckOut}:52` : null,
        verifiedByGuardOrSec: true
      });
    });
  });

  return records;
}

export const INITIAL_SANCTION_RULES: SanctionRule[] = [
  {
    id: "rule-1",
    name: "Seuil 3 Retards Mensuels (1er Niveau)",
    targetType: "RETARD",
    period: "MONTH",
    thresholdLateCount: 3,
    thresholdLateMinutes: 30,
    thresholdAbsenceCount: 0,
    sanctionType: "AVERTISSEMENT_VERBAL",
    deductionAmount: 0,
    currency: "USD",
    isActive: true,
    effectiveDate: "2026-01-01",
    description: "Tout employé cumulant 3 retards sur un mois civil fait l'objet d'un rappel à l'ordre verbal par son responsable de département."
  },
  {
    id: "rule-2",
    name: "Seuil 5 Retards Non Justifiés (Retenue financière)",
    targetType: "RETARD",
    period: "MONTH",
    thresholdLateCount: 5,
    thresholdLateMinutes: 60,
    thresholdAbsenceCount: 0,
    sanctionType: "RETENUE_SALARIALE_PROPOSEE",
    deductionAmount: 15,
    currency: "USD",
    isActive: true,
    effectiveDate: "2026-01-01",
    description: "Au-delà de 5 retards non justifiés dans le mois, notification d'avertissement écrit et retenue compensatoire de 15 USD sur salaire."
  },
  {
    id: "rule-3",
    name: "Retards Répétés Excessifs (>90 min cumulées)",
    targetType: "RETARD",
    period: "MONTH",
    thresholdLateCount: 6,
    thresholdLateMinutes: 90,
    thresholdAbsenceCount: 0,
    sanctionType: "BLAME",
    deductionAmount: 25,
    currency: "USD",
    isActive: true,
    effectiveDate: "2026-01-01",
    description: "Retards majeurs persistants. Proposition de blâme formel et retenue compensatoire de 25 USD validée par la Direction Générale."
  },
  {
    id: "rule-4",
    name: "Seuil 1ère Absence Non Justifiée (Retenue journalière)",
    targetType: "ABSENCE",
    period: "MONTH",
    thresholdLateCount: 0,
    thresholdLateMinutes: 0,
    thresholdAbsenceCount: 1,
    sanctionType: "RETENUE_SALARIALE_PROPOSEE",
    deductionAmount: 20,
    currency: "USD",
    isActive: true,
    effectiveDate: "2026-01-01",
    description: "Toute absence non justifiée d'une journée entraîne la retenue obligatoire de 20 USD (salaire journalier de base non presté)."
  },
  {
    id: "rule-5",
    name: "Absences Répétées Non Justifiées (≥ 2 journées)",
    targetType: "ABSENCE",
    period: "MONTH",
    thresholdLateCount: 0,
    thresholdLateMinutes: 0,
    thresholdAbsenceCount: 2,
    sanctionType: "BLAME",
    deductionAmount: 45,
    currency: "USD",
    isActive: true,
    effectiveDate: "2026-01-01",
    description: "Cumul de 2 journées ou plus d'absence injustifiée. Blâme au dossier disciplinaire et retenue de 45 USD approuvée par la Direction."
  }
];

export const INITIAL_SANCTION_CASES: SanctionCase[] = [
  {
    id: "sanc-001",
    employeeId: "PRM-017",
    employeeName: "PALUKU NGURAMO Jacques",
    matricule: "PRM-017",
    department: "Logistique & Magasin",
    period: "Octobre 2026",
    lateCount: 5,
    totalMinutesLate: 98,
    datesLate: ["2026-10-01", "2026-10-03", "2026-10-07", "2026-10-09", "2026-10-11"],
    absenceCount: 0,
    datesAbsent: [],
    ruleId: "rule-2",
    ruleName: "Seuil 5 Retards Non Justifiés (Retenue financière)",
    proposedSanction: "RETENUE_SALARIALE_PROPOSEE",
    deductionAmount: 15,
    approvedDeductionAmount: 15,
    currency: "USD",
    status: "EN_EXAMEN",
    justificationNotes: "L'employé allègue des pannes mécaniques répétées du camion lors des tournées matinales.",
    decisionDate: null,
    decidedBy: null,
    createdAt: "2026-10-11 08:45"
  },
  {
    id: "sanc-002",
    employeeId: "PRM-019",
    employeeName: "KAMBALE VALYALYA Clovis",
    matricule: "PRM-019",
    department: "Production & Usine",
    period: "Octobre 2026",
    lateCount: 4,
    totalMinutesLate: 88,
    datesLate: ["2026-10-02", "2026-10-06", "2026-10-08", "2026-10-11"],
    absenceCount: 0,
    datesAbsent: [],
    ruleId: "rule-1",
    ruleName: "Seuil 3 Retards Mensuels (1er Niveau)",
    proposedSanction: "AVERTISSEMENT_VERBAL",
    deductionAmount: 0,
    approvedDeductionAmount: 0,
    currency: "USD",
    status: "APPROUVEE",
    justificationNotes: "Entretien mené avec le chef d'usine Michel Muhindo le 09/10/2026.",
    decisionDate: "2026-10-09",
    decidedBy: "Justin Paluku (RH)",
    decisionMotif: "Rappel à l'ordre formel pour respect strict des horaires de démarrage de la chaîne.",
    createdAt: "2026-10-08 17:00"
  },
  {
    id: "sanc-003",
    employeeId: "PRM-008",
    employeeName: "KATEMBO SIKULISIMA Jonas",
    matricule: "PRM-008",
    department: "Production & Usine",
    period: "Octobre 2026",
    lateCount: 0,
    totalMinutesLate: 0,
    datesLate: [],
    absenceCount: 2,
    datesAbsent: ["2026-10-06", "2026-10-07"],
    ruleId: "rule-5",
    ruleName: "Absences Répétées Non Justifiées (≥ 2 journées)",
    proposedSanction: "BLAME",
    deductionAmount: 45,
    approvedDeductionAmount: 45,
    currency: "USD",
    status: "EN_EXAMEN",
    justificationNotes: "Deux jours d'absence sans avis préalable ni certificat médical homologué.",
    decisionDate: null,
    decidedBy: null,
    createdAt: "2026-10-08 09:00"
  },
  {
    id: "sanc-004",
    employeeId: "PRM-005",
    employeeName: "KAVIRA KYAVIRO Henriette",
    matricule: "PRM-005",
    department: "Ventes & Distribution",
    period: "Octobre 2026",
    lateCount: 0,
    totalMinutesLate: 0,
    datesLate: [],
    absenceCount: 1,
    datesAbsent: ["2026-10-02"],
    ruleId: "rule-4",
    ruleName: "Absence Injustifiée d'une Journée (Retenue salariale)",
    proposedSanction: "RETENUE_SALARIALE_PROPOSEE",
    deductionAmount: 20,
    approvedDeductionAmount: 20,
    currency: "USD",
    status: "APPROUVEE",
    justificationNotes: "Absence constatée le vendredi 02/10 sans justificatif valable.",
    decisionDate: "2026-10-05",
    decidedBy: "Direction Générale",
    decisionMotif: "Retenue compensatoire de 20 USD validée et déjà encaissée sur le décompte de paie.",
    createdAt: "2026-10-03 11:30"
  }
];

export const INITIAL_ZKTECO_CONFIG: ZKTecoDeviceConfig = {
  brand: "ZKTeco",
  model: "ZKTeco uFace800 Plus (Biométrie Empreinte & Facial)",
  ipAddress: "192.168.1.201",
  port: 4370,
  commKey: "0",
  connectionType: "DIRECT_TCP",
  status: "ONLINE",
  lastSyncTime: "2026-10-11 08:35:12",
  lastPunchImportedTime: "2026-10-11 08:34:45",
  importedPunchesCount: 1420,
  errorCount: 0,
  firmwareVersion: "Ver 8.0.4.3_Ver2.0.1_B3",
  serialNumber: "ZK800GOMAPRM2024",
  deviceUserCount: 52,
  deviceFingerprintCount: 104,
  autoSyncIntervalMinutes: 15,
  syncLogs: [
    {
      id: "log-1",
      timestamp: "2026-10-11 08:35:12",
      type: "AUTO_SCHEDULED",
      punchesImported: 24,
      newPunches: 24,
      duplicatesSkipped: 0,
      status: "SUCCESS",
      message: "Synchronisation automatique réussie via protocole ZKEMkeeper TCP port 4370.",
      operatorName: "Système Automatique"
    },
    {
      id: "log-2",
      timestamp: "2026-10-11 08:00:05",
      type: "AUTO_SCHEDULED",
      punchesImported: 18,
      newPunches: 18,
      duplicatesSkipped: 0,
      status: "SUCCESS",
      message: "Pointages d'ouverture de poste importés sans anomalie.",
      operatorName: "Système Automatique"
    },
    {
      id: "log-3",
      timestamp: "2026-10-10 17:05:30",
      type: "MANUAL_TRIGGER",
      punchesImported: 48,
      newPunches: 12,
      duplicatesSkipped: 36,
      status: "SUCCESS",
      message: "Synchronisation manuelle de fin de journée par le secrétariat.",
      operatorName: "Sylvie Masika (Secrétariat)"
    }
  ]
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "aud-1",
    timestamp: "2026-10-11 08:35:15",
    userId: "usr-admin",
    userName: "Franck Bahizi",
    userRole: "ADMIN",
    action: "SYNCHRONISATION_ZKTECO",
    target: "Pointeuse ZKTeco uFace800",
    details: "24 nouveaux pointages importés avec succès."
  },
  {
    id: "aud-2",
    timestamp: "2026-10-09 14:20:00",
    userId: "usr-rh",
    userName: "Justin Paluku",
    userRole: "RH",
    action: "APPROBATION_SANCTION",
    target: "PRM-019 (Clovis Kambale)",
    details: "Validation de l'avertissement verbal pour 4 retards cumulés."
  },
  {
    id: "aud-3",
    timestamp: "2026-10-08 10:15:30",
    userId: "usr-sec",
    userName: "Sylvie Masika",
    userRole: "SECRETAIRE",
    action: "CORRECTION_POINTAGE",
    target: "PRM-006 (Alain Kambale) - 2026-10-08",
    details: "Ajustement heure d'entrée de 08:45 à 08:28 suite à vérification registre physique du gardien."
  }
];
