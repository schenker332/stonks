// src/app/page.tsx

import { TransactionManager } from '../components/TransactionManager';


export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-800">
        Transaktionen verwalten
      </h2>
      <TransactionManager />
    </main>
  );
}




