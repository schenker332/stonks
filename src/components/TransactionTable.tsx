// src/components/TransactionTable.tsx
'use client';

interface Transaction {
  id: number;
  date: string;
  name: string;
  category: string;
  price: number;
  tag: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

interface TransactionTableProps {
  transactions: Transaction[];
  onTransactionDeleted: (id: number) => void;  // Callback beim Löschen
}

export function TransactionTable({ transactions, onTransactionDeleted }: TransactionTableProps) {
  
  const handleDelete = async (id: number) => {
    if (!confirm('Wirklich löschen?')) return;
    
    const resp = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    
    if (resp.ok) {
      onTransactionDeleted(id); // Sagt der Haupt-Komponente: "Lösche diese ID!"
    } else {
      alert('Löschen fehlgeschlagen');
    }
  };

  return (
    <div className="mb-6 mt-6 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
          <thead>
            <tr className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="rounded-tl-xl px-4 py-3">Datum</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Kategorie</th>
              <th className="px-4 py-3 text-right">Preis</th>
              <th className="px-4 py-3">Tag</th>
              <th className="rounded-tr-xl px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="transition-colors duration-200 hover:bg-slate-900/60"
              >
                <td className="px-4 py-3 text-slate-300">
                  {new Date(tx.date).toLocaleDateString('de-DE')}
                </td>
                <td className="px-4 py-3 text-slate-100">{tx.name}</td>
                <td className="px-4 py-3 text-slate-300">{tx.category}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    tx.type === 'income' ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {tx.type === 'expense' ? '- ' : '+ '}€{tx.price.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-slate-400">{tx.tag}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-rose-200 transition-all duration-300 hover:border-rose-400 hover:bg-rose-500/20 hover:text-rose-100"
                  >
                    Löschen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
