/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BookOpen,
  Boxes,
  CreditCard,
  HandCoins,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react';

type Module = {
  name: string;
  summary: string;
  icon: LucideIcon;
};

const MODULES: Module[] = [
  { name: 'CRM', summary: 'Fiches clients, contacts, historique d’achats.', icon: Users },
  { name: 'Ventes', summary: 'Devis, bons de commande, factures.', icon: ShoppingCart },
  { name: 'Caisse', summary: 'Encaissements, tickets, clôture journalière.', icon: CreditCard },
  { name: 'Stock', summary: 'Articles, entrées, sorties, inventaires.', icon: Boxes },
  { name: 'Crédits', summary: 'Ventes à crédit, échéances, relances.', icon: HandCoins },
  { name: 'Comptabilité', summary: 'Journal, grand livre, état des comptes.', icon: BookOpen },
];

export default function App() {
  return (
    <div className="min-h-full bg-(--bg) text-(--fg)">
      <header className="border-b border-(--line) bg-(--surface)">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img src="assets/premidis-logo.svg" alt="PREMIDIS" className="h-10 w-12 object-contain" />
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">ERP Distribution</p>
            <p className="text-xs text-(--muted)">PREMIDIS</p>
          </div>
          <span className="ml-auto rounded-full border border-(--line) px-2.5 py-0.5 text-xs text-(--muted)">
            Aperçu
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Tableau de bord</h1>
        <p className="mt-1 max-w-prose text-sm text-(--muted)">
          Version de départ de l’application. Les modules ci-dessous seront construits un par un.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ name, summary, icon: Icon }) => (
            <li key={name} className="flex gap-3 rounded-lg border border-(--line) bg-(--surface) p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-(--accent-soft) text-(--accent)">
                <Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{name}</h2>
                  <span className="rounded-full bg-(--pending-soft) px-2 py-0.5 text-[11px] font-medium text-(--pending)">
                    À construire
                  </span>
                </div>
                <p className="mt-1 text-sm text-(--muted)">{summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
