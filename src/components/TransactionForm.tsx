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
    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-lg shadow-slate-950/40">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-50">
          ➕ Manuell hinzufügen
        </h2>
        <p className="text-sm text-slate-500">
          Ergänze individuelle Buchungen mit wenigen Klicks.
        </p>
      </div>

      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-6">
        <input
          type="date"
          required
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100 shadow-inner shadow-slate-950/50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 md:col-span-2"
        />
        <input
          type="text"
          placeholder="Name"
          required
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-slate-950/50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 md:col-span-2"
        />
        <input
          type="text"
          placeholder="Kategorie"
          required
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-slate-950/50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 md:col-span-2"
        />
        <input
          type="number"
          placeholder="Preis"
          step="0.01"
          required
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-slate-950/50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 md:col-span-2"
        />
        <input
          type="text"
          placeholder="Tag"
          value={form.tag}
          onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
          className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-slate-950/50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 md:col-span-2"
        />
        <div className="flex gap-2 md:col-span-2">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100 shadow-inner shadow-slate-950/50 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
          <button
            type="submit"
            className="flex h-full items-center justify-center rounded-xl border border-sky-400/60 bg-sky-500/20 px-4 text-lg font-semibold text-sky-100 transition-all duration-300 hover:border-sky-300 hover:bg-sky-500/30 hover:text-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            +
          </button>
        </div>
      </form>
    </div>
  );
}
