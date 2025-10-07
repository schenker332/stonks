// src/components/OcrSection.tsx
'use client';
import { useState } from 'react';

interface OcrSectionProps {
  onOcrComplete: () => void;  // Callback wenn OCR fertig ist
}

export function OcrSection({ onOcrComplete }: OcrSectionProps) {
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrError, setOcrError] = useState('');

  const handleOcr = async () => {
    // Direkt zu /process weiterleiten - dort wird die API aufgerufen
    window.location.href = '/process';
  };

  return (
    <div className="mb-6 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-6 text-slate-100 shadow-lg shadow-sky-900/50">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">
            📷 OCR Transaktions-Import
          </h2>
          <p className="text-sm text-sky-100/80">
            Starte die Pipeline und lasse eingehende Belege automatisch auslesen.
          </p>
        </div>

        <button
          onClick={handleOcr}
          disabled={ocrLoading}
          className={`rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-widest transition-all duration-300 ${
            ocrLoading
              ? 'cursor-not-allowed border border-slate-600 bg-slate-800/60 text-slate-500'
              : 'border border-sky-400/60 bg-sky-500/20 text-sky-100 hover:border-sky-300 hover:bg-sky-500/30 hover:text-sky-50'
          }`}
        >
          {ocrLoading ? '🔄 Verarbeitung läuft…' : '🚀 OCR starten'}
        </button>
      </div>

      {ocrStatus && (
        <div className="mt-4 rounded-xl border border-sky-400/40 bg-sky-500/15 px-4 py-3 text-sm text-sky-100">
          {ocrStatus}
        </div>
      )}

      {ocrError && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
          {ocrError}
        </div>
      )}
    </div>
  );
}
