// src/components/TransactionForm.tsx
'use client';
import { useState, FormEvent } from 'react';

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

interface TransactionFormProps {
  onTransactionAdded: (newTransaction: Transaction) => void;  // Callback bei neuer Transaktion
}

export function TransactionForm({ onTransactionAdded }: TransactionFormProps) {
  const [form, setForm] = useState({
    date: '',
    name: '',
    category: '',
    price: '',
    tag: '',
    type: 'expense',
  });

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    
    const resp = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        tag: form.tag,
        type: form.type,
      }),
    });
    
    if (!resp.ok) return alert('Fehler beim Anlegen');
    
    const newTx: Transaction = await resp.json();
    onTransactionAdded(newTx); // Sagt der Haupt-Komponente: "Neue Transaktion hinzufügen!"
    setForm({ date: '', name: '', category: '', price: '', tag: '', type: 'expense' }); // Formular leeren
  };

  return (
    <div className="rounded-lg shadow p-4" style={{ background: '#D89986' }}>
      <h2 className="text-lg font-semibold mb-3 text-gray-800">➕ Manuell hinzufügen</h2>
      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-6 gap-3">
        <input
          type="date"
          required
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Name"
          required
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Kategorie"
          required
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="number"
          placeholder="Preis"
          step="0.01"
          required
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="border border-gray-300 p-2 rounded bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Tag"
          value={form.tag}
          onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
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
            +
          </button>
        </div>
      </form>
    </div>
  );
}