'use client';

import { useEffect, useState } from 'react';
import { ProcessSummary } from '@/components/ProcessSummary';

type LogEntry = {
  level: string;
  message: string;
  data?: any;
  timestamp?: string;
};

type BoxDetail = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type StitchedSummary = {
  width: number;
  height: number;
  filesize_mb?: number;
  imageUrl?: string;
};

type BoxesSummary = {
  count: number;
  boxes: BoxDetail[];
  imageUrl?: string;
};

type OcrSummary = {
  totalItems?: number;
  firstDate?: string;
  firstDateFound?: boolean;
  resultImageUrl?: string;
};

type SummaryData = {
  window?: { x: number; y: number; width: number; height: number };
  stitched?: StitchedSummary;
  boxes?: BoxesSummary;
  ocr?: OcrSummary;
};

export default function ProcessPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData>({});

  useEffect(() => {
    // EventSource für SSE
    const eventSource = new EventSource('/api/process');

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('🔗 SSE Verbindung hergestellt');
    };

    eventSource.onmessage = (event) => {
      let logEntry;
      try {
        logEntry = JSON.parse(event.data);
      } catch (parseError) {
        console.warn('⚠️ Konnte Log nicht parsen', { eventData: event.data, parseError });
        return;
      }
      logEntry.timestamp = new Date().toLocaleTimeString('de-DE');
      
      console.log('📨 Received log:', logEntry); // Debug
      
      // Summary-Daten extrahieren
      if (logEntry.level === 'summary') {
        if (logEntry.message === '🖥️ Finanzguru-Fenster') {
          setSummaryData((prev) => ({ ...prev, window: logEntry.data }));
        } else if (logEntry.message === '🧩 Zusammengesetztes Bild') {
          const timestamp = Date.now();
          setSummaryData((prev) => ({
            ...prev,
            stitched: {
              width: logEntry.data?.width ?? 0,
              height: logEntry.data?.height ?? 0,
              filesize_mb: logEntry.data?.filesize_mb,
              imageUrl: `/api/process/media/stitched.png?ts=${timestamp}`,
            },
          }));
        } else if (logEntry.message === '📦 Transaktionsboxen') {
          setSummaryData((prev) => ({
            ...prev,
            boxes: {
              count: logEntry.data?.count ?? 0,
              boxes: logEntry.data?.boxes ?? [],
              imageUrl: prev.ocr?.resultImageUrl ?? prev.boxes?.imageUrl,
            },
          }));
        }
      } else if (logEntry.level === 'info') {
        if (logEntry.message === '📅 Erstes Datum erkannt') {
          const firstDate = (logEntry.data?.date ?? '').trim();
          setSummaryData((prev) => ({
            ...prev,
            ocr: {
              ...prev.ocr,
              firstDate,
              firstDateFound: Boolean(firstDate),
            },
          }));
        } else if (logEntry.message === '✅ OCR Pipeline abgeschlossen') {
          const timestamp = Date.now();
          const resultImageUrl = `/api/process/media/ocr_result.png?ts=${timestamp}`;
          setSummaryData((prev) => ({
            ...prev,
            ocr: {
              ...prev.ocr,
              totalItems: logEntry.data?.total_items ?? prev.ocr?.totalItems,
              resultImageUrl,
            },
            boxes: prev.boxes
              ? {
                  ...prev.boxes,
                  imageUrl: resultImageUrl,
                }
              : prev.boxes,
          }));
        }
      }
      
      setLogs((prev) => [...prev, logEntry]);

      // Nur bei PIPELINE abgeschlossen beenden (nicht bei anderen "abgeschlossen" Messages)
      if (logEntry.message === '✅ Pipeline erfolgreich abgeschlossen' || 
          logEntry.message === '❌ Pipeline mit Fehler beendet') {
        console.log('🏁 Pipeline fertig, schließe Connection');
        setIsRunning(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setIsRunning(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getLevelStyles = (level: string) => {
    switch (level) {
      case 'error':
        return 'border-red-500/40 bg-red-500/10 text-red-200';
      case 'warning':
        return 'border-amber-400/40 bg-amber-400/10 text-amber-200';
      case 'info':
        return 'border-sky-400/40 bg-sky-500/10 text-sky-200';
      case 'debug':
        return 'border-slate-600/60 bg-slate-800/60 text-slate-300';
      case 'summary':
        return 'border-purple-500/40 bg-purple-500/10 text-purple-200';
      default:
        return 'border-slate-700 bg-slate-900 text-slate-200';
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      case 'summary': return '📊';
      default: return '📝';
    }
  };

  return (
    <main className="min-h-screen py-12 px-6 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
              Live Monitoring
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-50">
              🚀 OCR Pipeline
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Echtzeit-Logs aus der Python-Pipeline mit Status-Indikator und
              Streaming-Updates via Server-Sent Events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && isRunning && (
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-emerald-300 shadow-[0_0_30px_-15px] shadow-emerald-500/50">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium uppercase tracking-widest">
                  Läuft
                </span>
              </div>
            )}

            {!isRunning && (
              <div className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-slate-300">
                <span className="text-sm font-medium uppercase tracking-widest">
                  ✅ Abgeschlossen
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Summary Dashboard */}
        <ProcessSummary summaryData={summaryData} />

        <section className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-xl shadow-slate-900/40">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-50">Live Logs</h2>
            <span className="text-xs uppercase tracking-[0.35em] text-slate-600">
              Stream
            </span>
          </div>

          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/70">
            {logs.length === 0 && (
              <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 py-10 text-center text-slate-500">
                Warte auf Logs…
              </div>
            )}

            {logs.map((log, index) => (
              <div
                key={index}
                className={`rounded-xl border p-4 shadow-inner shadow-slate-900/40 transition-colors duration-300 ${getLevelStyles(log.level)}`}
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 text-2xl">{getLevelEmoji(log.level)}</span>

                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
                      <span className="font-mono text-slate-400">
                        {log.timestamp}
                      </span>
                      <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2 py-0.5 font-semibold text-slate-300">
                        {log.level}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-100">
                      {log.message}
                    </p>

                    {log.data && Object.keys(log.data).length > 0 && (
                      <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-[11px] leading-relaxed text-slate-300">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap gap-3">
          <button
            onClick={() => (window.location.href = '/')}
            className="rounded-full border border-sky-500/50 bg-sky-500/10 px-6 py-3 text-sm font-medium uppercase tracking-widest text-sky-300 transition-all duration-300 hover:border-sky-400 hover:bg-sky-500/20 hover:text-sky-200"
          >
            🏠 Zurück zum Dashboard
          </button>

          {!isRunning && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-emerald-500/60 bg-emerald-500/10 px-6 py-3 text-sm font-medium uppercase tracking-widest text-emerald-200 transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-100"
            >
              🔄 Erneut ausführen
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}
