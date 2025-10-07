// src/components/OcrSection.tsx
'use client';
import { useRouter } from 'next/navigation';

interface OcrSectionProps {
  onOcrComplete: () => void;  // Callback wenn OCR fertig ist
}

export function OcrSection({ onOcrComplete }: OcrSectionProps) {
  const router = useRouter();

  const handleOcr = () => {
    // Verwende Next.js Router für Client-side Navigation
    router.push('/process');
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
          className="rounded-full border border-sky-400/60 bg-sky-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-sky-100 transition-all duration-300 hover:border-sky-300 hover:bg-sky-500/30 hover:text-sky-50"
        >
          🚀 OCR starten
        </button>
      </div>
    </div>
  );
}
