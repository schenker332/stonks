// src/components/TransactionManager.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

export function TransactionManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState({
    date: '',
    description: '',
    amount: '',
    type: 'expense',
  });

  // Beim Laden: GET
  useEffect(() => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(setTransactions);
  }, []);

  // POST: neue Transaktion
  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const resp = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
      }),
    });
    if (!resp.ok) return alert('Fehler beim Anlegen');
    const newTx: Transaction = await resp.json();
    setTransactions([newTx, ...transactions]);
    setForm({ date: '', description: '', amount: '', type: 'expense' });
  }

  // DELETE: Transaktion löschen
  async function handleDelete(id: number) {
    if (!confirm('Wirklich löschen?')) return;
    const resp = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    if (resp.ok) {
      setTransactions(transactions.filter(tx => tx.id !== id));
    } else {
      alert('Löschen fehlgeschlagen');
    }
  }

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-4 gap-4">
        <input
          type="date"
          required
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Beschreibung"
          required
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="border p-2 rounded"
        />
        <input
          type="number"
          placeholder="Betrag"
          step="0.01"
          required
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          className="border p-2 rounded"
        />
        <div className="flex space-x-2">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="border p-2 rounded flex-1"
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 rounded"
          >
            Hinzufügen
          </button>
        </div>
      </form>

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
    </div>
  );
}
