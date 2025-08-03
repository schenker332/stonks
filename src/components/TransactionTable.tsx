// src/components/TransactionTable.tsx
type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="mt-8 bg-white shadow rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Datum</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Beschreibung</th>
            <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">Betrag</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map(tx => (
            <tr key={tx.id}>
              <td className="px-4 py-2 text-sm text-gray-700">{new Date(tx.date).toLocaleDateString('de-DE')}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{tx.description}</td>
              <td
                className={`px-4 py-2 text-sm font-semibold ${
                  tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {tx.type === 'expense' ? '- ' : '+ '}€{tx.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
