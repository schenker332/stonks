// src/components/TransactionTable.tsx
'use client';

interface Transaction {
  id: number;
  date: string;
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm text-gray-500">Datum</th>
            <th className="px-4 py-2 text-left text-sm text-gray-500">Beschreibung</th>
            <th className="px-4 py-2 text-right text-sm text-gray-500">Betrag</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map(tx => (
            <tr key={tx.id}>
              <td className="px-4 py-2 text-sm text-gray-700">
                {new Date(tx.date).toLocaleDateString('de-DE')}
              </td>
              <td className="px-4 py-2 text-sm text-gray-700">
                {tx.description}
              </td>
              <td
                className={`px-4 py-2 text-sm font-semibold ${
                  tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {tx.type === 'expense' ? '- ' : '+ '}€{tx.amount.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-sm">
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="text-red-500 hover:underline"
                >
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}