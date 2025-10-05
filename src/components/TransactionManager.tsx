// src/components/TransactionManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { OcrSection } from './OcrSection';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';

type Transaction = {
  id: number;
  date: string;
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
    <div className="p-4 shadow rounded-lg" style={{ background: '#90A8C3' }}>
      <OcrSection onOcrComplete={loadTransactions} />
      <TransactionForm onTransactionAdded={addTransaction} />
      <TransactionTable 
        transactions={transactions} 
        onTransactionDeleted={removeTransaction} 
      />
    </div>
  );
}
