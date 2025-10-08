'use client';

import { useRouter } from 'next/navigation';

export function OcrSection() {
  const router = useRouter();

  return (
    <div className="mb-6 rounded-2xl border border-slate-800/60 bg-slate-950/70 p-6 text-slate-100 shadow-xl shadow-slate-950/40">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">⚙️ Process</h2>
          <p className="text-sm text-slate-400">
            Öffne die Process-Seite, um die Pipeline-Schritte einzusehen, Logs zu prüfen und
            manuell neue OCR-Läufe zu starten.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/process')}
          className="rounded-full border border-sky-500/50 bg-sky-500/10 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-sky-200 transition-all duration-300 hover:border-sky-400 hover:bg-sky-500/20 hover:text-sky-100"
        >
          🔍 Process ansehen
        </button>
      </div>
    </div>
  );
}

