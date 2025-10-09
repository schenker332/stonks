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
    <div className="mb-6 mt-6 rounded-2xl border border-[#e6dcff] bg-white/85 p-6 shadow-[0_18px_50px_rgba(211,165,248,0.15)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e5dbff] text-left text-sm text-[#3b2a63]">
          <thead>
            <tr className="bg-[#f2eaff] text-xs uppercase tracking-[0.2em] text-[#7f63bb]">
              <th className="rounded-tl-xl px-4 py-3 text-left">Datum</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Kategorie</th>
              <th className="px-4 py-3 text-right">Preis</th>
              <th className="px-4 py-3">Tag</th>
              <th className="rounded-tr-xl px-4 py-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece4ff]">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="transition-colors duration-200 hover:bg-[#f6efff]"
              >
                <td className="px-4 py-3 text-[#4a366f]">
                  {new Date(tx.date).toLocaleDateString('de-DE')}
                </td>
                <td className="px-4 py-3 text-[#2c1f54] font-medium">{tx.name}</td>
                <td className="px-4 py-3 text-[#4a366f]">{tx.category}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    tx.type === 'income' ? 'text-emerald-500' : 'text-rose-400'
                  }`}
                >
                  {tx.type === 'expense' ? '- ' : '+ '}€{tx.price.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-[#6f5aa4]">{tx.tag}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="rounded-full border border-[#f2b4d3] bg-[#f9d4e7] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#a63d71] transition-all duration-300 hover:border-[#e99bc1] hover:bg-[#f7c6dd] hover:text-[#802b55]"
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
