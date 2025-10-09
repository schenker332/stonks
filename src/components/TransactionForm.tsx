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
    <div className="rounded-2xl border border-[#e6dcff] bg-white/85 p-6 shadow-[0_20px_60px_rgba(211,165,248,0.18)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#341b64]">
          ➕ Manuell hinzufügen
        </h2>
        <p className="text-sm text-[#6d5a94]">
          Ergänze individuelle Buchungen mit wenigen Klicks.
        </p>
      </div>

      <form onSubmit={handleAdd} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-6">
        <input
          type="date"
          required
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="rounded-xl border border-[#d9cfff] bg-white/90 p-3 text-sm text-[#2c1f54] shadow-inner focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40 md:col-span-2"
        />
        <input
          type="text"
          placeholder="Name"
          required
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="rounded-xl border border-[#d9cfff] bg-white/90 p-3 text-sm text-[#2c1f54] placeholder-[#a18ed2] shadow-inner focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40 md:col-span-2"
        />
        <input
          type="text"
          placeholder="Kategorie"
          required
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="rounded-xl border border-[#d9cfff] bg-white/90 p-3 text-sm text-[#2c1f54] placeholder-[#a18ed2] shadow-inner focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40 md:col-span-2"
        />
        <input
          type="number"
          placeholder="Preis"
          step="0.01"
          required
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="rounded-xl border border-[#d9cfff] bg-white/90 p-3 text-sm text-[#2c1f54] placeholder-[#a18ed2] shadow-inner focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40 md:col-span-2"
        />
        <input
          type="text"
          placeholder="Tag"
          value={form.tag}
          onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
          className="rounded-xl border border-[#d9cfff] bg-white/90 p-3 text-sm text-[#2c1f54] placeholder-[#a18ed2] shadow-inner focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40 md:col-span-2"
        />
        <div className="flex gap-2 md:col-span-2">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="flex-1 rounded-xl border border-[#d9cfff] bg-white/90 p-3 text-sm text-[#2c1f54] shadow-inner focus:border-[#c89bf6] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
          <button
            type="submit"
            className="flex h-full items-center justify-center rounded-xl border border-[#d3a5f8] bg-[#d3a5f8]/30 px-4 text-lg font-semibold text-[#36215f] transition-all duration-300 hover:border-[#c897f6] hover:bg-[#d3a5f8]/40 hover:text-[#2a184a] focus:outline-none focus:ring-2 focus:ring-[#d3a5f8]/40"
          >
            +
          </button>
        </div>
      </form>
    </div>
  );
}
