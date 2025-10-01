// src/components/CsvImporter.tsx
'use client';

import { useState } from 'react';
import Papa from 'papaparse';

type CsvRow = {
  date: string;
  description: string;
  amount: string;
  type: string;
};

export function CsvImporter({
  onImported,
}: {
  onImported: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Map CSV-Strings in korrektes Format
          const transactions = results.data.map((row) => ({
            date: row.date,
            description: row.description,
            amount: parseFloat(row.amount),
            type: (row.type === 'income' || row.type === 'expense')
              ? row.type
              : 'expense',
          }));

          const resp = await fetch('/api/transactions/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions }),
          });

          if (!resp.ok) {
            const text = await resp.text();
            throw new Error(text);
          }
          onImported(); // z.B. reload der Liste
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'Import fehlgeschlagen');
        } finally {
          setUploading(false);
        }
      },
      error: (err) => {
        console.error(err);
        setError('Fehler beim Parsen der CSV');
        setUploading(false);
      }
    });
  }

  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium text-gray-700">CSV importieren</label>
      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        disabled={uploading}
        className="border border-gray-300 p-2 rounded bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 focus:border-blue-500 focus:outline-none"
      />
      {uploading && <p className="text-sm text-gray-500">Import läuft…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
