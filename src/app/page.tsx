// src/app/page.tsx

import { TransactionManager } from '@/components/dashboard/TransactionManager';


export default function DashboardPage() {
  return (
    <main className="min-h-screen py-12 px-6 text-[#21183c]">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-[#a17bdc]">
            Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-[#2c1f54]">
            Transaktionen verwalten
          </h1>
        </header>

        <TransactionManager />
      </div>
    </main>
  );
}

