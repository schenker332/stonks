// src/components/TransactionForm.tsx
'use client';
import { useState, FormEvent } from 'react';

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

interface TransactionFormProps {
  onTransactionAdded: (newTransaction: Transaction) => void;  // Callback bei neuer Transaktion
}

export function TransactionForm({ onTransactionAdded }: TransactionFormProps) {
  const [form, setForm] = useState({
    date: '',
    description: '',
    amount: '',
    type: 'expense',
  });

  const handleAdd = async (e: FormEvent) => {
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
    onTransactionAdded(newTx); // Sagt der Haupt-Komponente: "Neue Transaktion hinzufügen!"
    setForm({ date: '', description: '', amount: '', type: 'expense' }); // Formular leeren
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-gray-800">➕ Manuell hinzufügen</h2>
      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-4 gap-4">
        <input
          type="date"
          required
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Beschreibung"
          required
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Betrag"
          step="0.01"
          required
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <div className="flex space-x-2">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="border border-gray-300 p-2 rounded flex-1 bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Hinzufügen
          </button>
        </div>
      </form>
    </div>
  );
}