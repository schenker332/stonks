// src/app/page.tsx

import { TransactionManager } from '../components/TransactionManager';


export default function DashboardPage() {
  return (
    <main className="min-h-screen py-12 px-6 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-50">
            Transaktionen verwalten
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Erfasse neue Buchungen, importiere Daten über die OCR-Pipeline und halte
            deine Finanzen übersichtlich im Blick – alles in einem dunklen Interface.
          </p>
        </header>

        <TransactionManager />
      </div>
    </main>
  );
}



