// src/app/page.tsx
import { StatCard } from '../components/StatCard';
import { TransactionTable } from '../components/TransactionTable';


export default async function DashboardPage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // 1) Stats laden
  const statsRes = await fetch(`${baseUrl}/api/stats`, { cache: 'no-store' });
  const response = await statsRes.json();
  const statKeys = Object.keys(response.data);

  // 2) Transaktionen laden
  const res = await fetch(`${baseUrl}/api/transactions`, { cache: 'no-store' });
  if (!res.ok) {
    // zeigt dir das genaue HTML oder den Fehler-Status
    const text = await res.text();
    console.error('API-Fehler:', res.status, text);
    throw new Error('Transaktionen konnten nicht geladen werden');
  }
  const transactions = await res.json();



  return (
    <main className="min-h-screen bg-gray-100 p-8">
      {/* Statistiken */}
      <h1 className="text-3xl font-bold mb-6">Finance Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statKeys.map(key => (
          <StatCard
            key={key}                    // React's interne Optimierung
            dataKey={key}                // Unser Parameter für StatCard
            values={response.data}
            labels={response.labels}
          />
        ))}
      </div>
      {/* Transaktions-Übersicht */}
      <h2 className="text-2xl font-semibold mt-10 mb-4">Letzte Transaktionen</h2>
      <TransactionTable transactions={transactions} />

    </main>
  );
}





