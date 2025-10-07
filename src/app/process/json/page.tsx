'use client';

import { useEffect, useState } from 'react';

type LogEntry = {
  level: string;
  message: string;
  data?: any;
  timestamp?: string;
};

export default function ProcessJsonPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/process/logs', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load logs');
      const data = await res.json();
      setLogs(data);
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'error':
        return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
      case 'warning':
        return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
      case 'info':
        return 'border-sky-400/40 bg-sky-500/10 text-sky-200';
      case 'debug':
        return 'border-slate-600/60 bg-slate-800/60 text-slate-300';
      default:
        return 'border-slate-700 bg-slate-900 text-slate-200';
    }
  };

  return (
    <main className="min-h-screen py-12 px-6 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Debug</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-50">JSON Log Viewer</h1>
          <p className="mt-2 text-sm text-slate-400">
            Zeigt die gespeicherten JSON-Logs aus der Pipeline (persistiert als JSONL).
          </p>
        </header>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="rounded-full border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-sky-300 hover:border-sky-400 hover:bg-sky-500/20"
          >
            ↻ Aktualisieren
          </button>
          <a
            href="/api/process/logs"
            className="text-xs text-slate-400 underline hover:text-slate-300"
            target="_blank"
          >
            Rohdaten öffnen
          </a>
        </div>

        <section className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-xl shadow-slate-900/40">
          {loading && (
            <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 text-center text-slate-500">
              Lädt…
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/70">
              {logs.length === 0 && (
                <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 py-10 text-center text-slate-500">
                  Keine Logs gefunden.
                </div>
              )}

              {logs.map((log: LogEntry, idx: number) => (
                <div key={idx} className={`rounded-xl border p-4 ${getLevelStyles(log.level)}`}>
                  <div className="mb-1 text-xs uppercase tracking-widest text-slate-400">
                    {log.level}
                  </div>
                  <div className="text-sm font-medium text-slate-100">{log.message}</div>
                  {log.data && (
                    <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-[11px] leading-relaxed text-slate-300">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

