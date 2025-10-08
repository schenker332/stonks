// src/components/TransactionManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { OcrSection } from './OcrSection';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';

type Transaction = {
  id: number;
  date: string;
  name: string;
  category: string;
  price: number;
  tag: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

export function TransactionManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Transaktionen beim Start laden
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    fetch('/api/transactions')
      .then(res => res.json())
      .then(setTransactions);
  };

  const addTransaction = (newTx: Transaction) => {
    setTransactions([newTx, ...transactions]);
  };

  const removeTransaction = (id: number) => {
    setTransactions(transactions.filter(tx => tx.id !== id));
  };

  return (
    <div className="rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur">
      <OcrSection />
      <TransactionForm onTransactionAdded={addTransaction} />
      <TransactionTable
        transactions={transactions}
        onTransactionDeleted={removeTransaction}
      />
    </div>
  );
}
