'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProcessSummary } from '@/components/ProcessSummary';

type LogEntry = {
  level: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  timestamp?: string;
};

type StepId = 'capture' | 'stitch' | 'ocr';

type StepStatus = 'idle' | 'running' | 'done' | 'error';

type StepConfig = {
  id: StepId;
  title: string;
  description: string;
  icon: string;
  matchers: RegExp[];
};

type BoxDetail = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type SummaryData = {
  window?: { x: number; y: number; width: number; height: number };
  stitched?: {
    width: number;
    height: number;
    filesize_mb?: number;
    imageUrl?: string;
  };
  boxes?: { count: number; boxes: BoxDetail[]; imageUrl?: string };
  ocr?: {
    totalItems?: number;
    firstDate?: string;
    firstDateFound?: boolean;
    resultImageUrl?: string;
  };
};

type PipelineState = {
  grouped: Record<StepId, LogEntry[]>;
  statusByStep: Record<StepId, StepStatus>;
  currentStepIndex: number;
  summaryData: SummaryData;
  pipelineFinished: boolean;
  hasErrors: boolean;
};

const STEP_CONFIGS: StepConfig[] = [
  {
    id: 'capture',
    title: 'Screenshots aufnehmen & croppen',
    description: 'capture_and_crop_screenshots() sammelt die Scroll-Sequenz und schneidet sie zu.',
    icon: '📸',
    matchers: [
      /capture/i,
      /screenshot/i,
      /shot_/i,
      /scroll/i,
      /cropp/i,
      /crop/i,
      /✂️/,
      /📸/,
      /fenster/i,
    ],
  },
  {
    id: 'stitch',
    title: 'Scroll-Sequenz zusammenfügen',
    description: 'stitch_scroll_sequence() baut die Crops zu einem langen Bild zusammen.',
    icon: '🧵',
    matchers: [
      /stitch/i,
      /zusammen/i,
      /match score/i,
      /template/i,
      /stitched/i,
      /🧩/,
      /🔗/,
    ],
  },
  {
    id: 'ocr',
    title: 'OCR & Analyse',
    description: 'ocr_extract() erkennt Transaktionen und erstellt das Ergebnis.',
    icon: '🧠',
    matchers: [
      /ocr/i,
      /transaktions/i,
      /item/i,
      /datum/i,
      /pipeline abgeschlossen/i,
      /📅/,
      /📦/,
      /✅/,
    ],
  },
];

const RUN_END_MESSAGES = new Set(['✅ Pipeline abgeschlossen', '❌ Pipeline mit Fehler beendet']);
const STREAM_TIMESTAMP_LOCALE = 'de-DE';

function isRunEndMessage(message?: string) {
  if (!message) return false;
  return RUN_END_MESSAGES.has(message);
}

function extractLatestRun(allLogs: LogEntry[]) {
  if (!Array.isArray(allLogs) || allLogs.length === 0) {
    return [];
  }

  const runs: LogEntry[][] = [];
  let current: LogEntry[] = [];

  allLogs.forEach((log) => {
    current.push(log);
    if (isRunEndMessage(log.message)) {
      runs.push(current);
      current = [];
    }
  });

  if (current.length > 0) {
    runs.push(current);
  }

  return runs[runs.length - 1] ?? [];
}

function matchStepIndex(log: LogEntry): number | null {
  const message = log.message ?? '';
  const dataString = log.data ? JSON.stringify(log.data) : '';

  for (let index = 0; index < STEP_CONFIGS.length; index += 1) {
    const config = STEP_CONFIGS[index];
    const matched = config.matchers.some((regex) => regex.test(message) || regex.test(dataString));
    if (matched) return index;
  }

  if (log.level === 'summary') {
    if (message.includes('Finanzguru')) return 0;
    if (message.includes('Zusammengesetztes Bild')) return 1;
    if (message.includes('Transaktionsboxen')) return 2;
  }

  if (log.level === 'error' && typeof log.data?.error === 'string') {
    const errorText = log.data.error;
    if (/capture/i.test(errorText)) return 0;
    if (/stitch/i.test(errorText)) return 1;
    if (/ocr/i.test(errorText)) return 2;
  }

  return null;
}

function clampIndex(index: number) {
  if (index < 0) return 0;
  if (index >= STEP_CONFIGS.length) return STEP_CONFIGS.length - 1;
  return index;
}

function resolveStepIndex(log: LogEntry, currentIndex: number) {
  const matched = matchStepIndex(log);
  if (matched !== null) return clampIndex(matched);
  if (currentIndex >= 0) return clampIndex(currentIndex);
  return 0;
}

function buildSummaryData(logs: LogEntry[]): SummaryData {
  return logs.reduce<SummaryData>((acc, log) => {
    const next: SummaryData = { ...acc };

    if (log.level === 'summary') {
      if (log.message === '🖥️ Finanzguru-Fenster') {
        next.window = log.data;
      } else if (log.message === '🧩 Zusammengesetztes Bild') {
        const ts = Date.now();
        next.stitched = {
          width: log.data?.width ?? 0,
          height: log.data?.height ?? 0,
          filesize_mb: log.data?.filesize_mb,
          imageUrl: `/api/process/media/stitched.png?ts=${ts}`,
        };
      } else if (log.message === '📦 Transaktionsboxen') {
        const prevBoxes = next.boxes;
        next.boxes = {
          count: log.data?.count ?? prevBoxes?.count ?? 0,
          boxes: log.data?.boxes ?? prevBoxes?.boxes ?? [],
          imageUrl: prevBoxes?.imageUrl ?? next.ocr?.resultImageUrl,
        };
      }
    } else if (log.level === 'info') {
      if (log.message === '📅 Erstes Datum erkannt') {
        const firstDate = (log.data?.date ?? '').trim();
        next.ocr = {
          ...next.ocr,
          firstDate,
          firstDateFound: Boolean(firstDate),
        };
      } else if (log.message === '✅ OCR Pipeline abgeschlossen') {
        const ts = Date.now();
        const resultImageUrl = `/api/process/media/ocr_result.png?ts=${ts}`;
        next.ocr = {
          ...next.ocr,
          totalItems: log.data?.total_items ?? next.ocr?.totalItems,
          resultImageUrl,
        };
        if (next.boxes) {
          next.boxes = { ...next.boxes, imageUrl: resultImageUrl };
        }
      }
    }

    return next;
  }, {});
}

function derivePipelineState(logs: LogEntry[]): PipelineState {
  const grouped: Record<StepId, LogEntry[]> = {
    capture: [],
    stitch: [],
    ocr: [],
  };

  let currentIndex = -1;
  let pipelineFinished = false;
  const errors = new Set<StepId>();

  logs.forEach((log) => {
    const stepIndex = resolveStepIndex(log, currentIndex);
    currentIndex = Math.max(currentIndex, stepIndex);
    const step = STEP_CONFIGS[stepIndex] ?? STEP_CONFIGS[STEP_CONFIGS.length - 1];
    grouped[step.id].push(log);

    if (log.level === 'error') {
      errors.add(step.id);
    }

    if (isRunEndMessage(log.message)) {
      pipelineFinished = true;
    }
  });

  if (currentIndex === -1) {
    currentIndex = 0;
  }

  const hasErrors = errors.size > 0;

  const statusByStep: Record<StepId, StepStatus> = {
    capture: 'idle',
    stitch: 'idle',
    ocr: 'idle',
  };

  STEP_CONFIGS.forEach((step, index) => {
    const hasLogEntries = grouped[step.id].length > 0;
    let status: StepStatus = 'idle';

    if (errors.has(step.id)) {
      status = 'error';
    } else if (pipelineFinished && !hasErrors && hasLogEntries) {
      status = 'done';
    } else if (index < currentIndex && hasLogEntries) {
      status = 'done';
    } else if (index === currentIndex && hasLogEntries) {
      status = hasErrors ? 'error' : 'running';
    } else if (hasLogEntries) {
      status = 'running';
    }

    statusByStep[step.id] = status;
  });

  return {
    grouped,
    statusByStep,
    currentStepIndex: clampIndex(currentIndex),
    summaryData: buildSummaryData(logs),
    pipelineFinished,
    hasErrors,
  };
}

const STATUS_LABEL: Record<StepStatus, string> = {
  idle: 'Wartet',
  running: 'Läuft',
  done: 'Fertig',
  error: 'Fehler',
};

const STATUS_STYLES: Record<StepStatus, string> = {
  idle: 'border-slate-700 bg-slate-900 text-slate-400',
  running: 'border-sky-400/60 bg-sky-500/10 text-sky-200',
  done: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
  error: 'border-rose-500/60 bg-rose-500/10 text-rose-200',
};

export default function ProcessPage() {
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<StepId | null>(null);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const loadLatestLogs = useCallback(async () => {
    setIsRefreshing(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/process/logs', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Fehler beim Laden der Logs');
      }

      const payload: LogEntry[] = await response.json();
      const latestRun = extractLatestRun(payload);
      const decorated = latestRun.map((entry) => ({
        ...entry,
        timestamp: entry.timestamp ?? '–',
      }));

      setLogs(decorated);
      setIsRunning(false);
      setLastUpdated(Date.now());
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFetchError(error.message);
      } else {
        setFetchError('Fehler beim Laden der Logs');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLatestLogs();
    return () => {
      closeEventSource();
    };
  }, [closeEventSource, loadLatestLogs]);

  const handleStartPipeline = useCallback(() => {
    if (isRunning) return;

    closeEventSource();
    setFetchError(null);
    setLogs([]);
    setIsRunning(true);

    const eventSource = new EventSource('/api/process');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const parsed: LogEntry = JSON.parse(event.data);
        const decorated: LogEntry = {
          ...parsed,
          timestamp: new Date().toLocaleTimeString(STREAM_TIMESTAMP_LOCALE),
        };
        setLogs((prev) => [...prev, decorated]);
        setLastUpdated(Date.now());

        if (isRunEndMessage(parsed.message)) {
          setIsRunning(false);
          closeEventSource();
          // kurze Pause, damit die Datei sicher geschrieben ist
          setTimeout(() => {
            loadLatestLogs();
          }, 400);
        }
      } catch (error) {
        console.warn('⚠️ Konnte Log nicht parsen:', error);
      }
    };

    eventSource.onerror = () => {
      setFetchError('SSE-Verbindung unterbrochen');
      setIsRunning(false);
      closeEventSource();
    };
  }, [closeEventSource, isRunning, loadLatestLogs]);

  const pipelineState = useMemo(() => derivePipelineState(logs), [logs]);

  const stepCards = useMemo(
    () =>
      STEP_CONFIGS.map((step, index) => ({
        index,
        step,
        logs: pipelineState.grouped[step.id],
        status: pipelineState.statusByStep[step.id],
      })),
    [pipelineState.grouped, pipelineState.statusByStep],
  );

  const selectedStep = useMemo(
    () => stepCards.find((card) => card.step.id === selectedStepId) ?? null,
    [selectedStepId, stepCards],
  );

  const hasAnyLogs = stepCards.some((card) => card.logs.length > 0);
  const hasErrors = pipelineState.hasErrors || stepCards.some((card) => card.status === 'error');
  const pipelineFinished = pipelineState.pipelineFinished && !isRunning;

  const statusBadge = (() => {
    if (isRunning) {
      return {
        label: 'Pipeline läuft',
        className:
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 shadow-[0_0_30px_-15px] shadow-emerald-500/40',
      };
    }
    if (hasErrors) {
      return {
        label: 'Fehler erkannt',
        className: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
      };
    }
    if (pipelineFinished && hasAnyLogs) {
      return {
        label: 'Letzter Lauf abgeschlossen',
        className: 'border-slate-700 bg-slate-900/80 text-slate-300',
      };
    }
    return {
      label: 'Wartet auf Start',
      className: 'border-slate-700 bg-slate-900/60 text-slate-400',
    };
  })();

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(STREAM_TIMESTAMP_LOCALE)
    : '–';

  return (
    <main className="min-h-screen bg-slate-950 py-12 px-6 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Pipeline Control
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-50">
                🛠️ Process Monitor
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-400">
                Greife auf die gespeicherten JSON-Logs der Python-Pipeline zu, starte neue
                Durchläufe manuell und inspiziere die Schritte einzeln.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 font-mono tracking-widest">
                Zuletzt aktualisiert: {lastUpdatedLabel}
              </span>
              {pipelineFinished && !hasErrors && (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-semibold uppercase tracking-widest text-emerald-200">
                  ✅ Lauf abgeschlossen
                </span>
              )}
            </div>

            {fetchError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                {fetchError}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div
              className={`flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${statusBadge.className}`}
            >
              <span>{statusBadge.label}</span>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleStartPipeline}
                disabled={isRunning}
                className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${
                  isRunning
                    ? 'cursor-not-allowed border-slate-700 bg-slate-900/60 text-slate-500'
                    : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-50'
                }`}
              >
                🚀 OCR manuell starten
              </button>

              <button
                type="button"
                onClick={loadLatestLogs}
                disabled={isRefreshing}
                className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${
                  isRefreshing
                    ? 'cursor-wait border-slate-700 bg-slate-900/60 text-slate-500'
                    : 'border-sky-500/50 bg-sky-500/10 text-sky-200 hover:border-sky-400 hover:bg-sky-500/20 hover:text-sky-100'
                }`}
              >
                ↻ Logs aktualisieren
              </button>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
              >
                🏠 Zum Dashboard
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-800/60 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/40">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-50">Pipeline Schritte</h2>
              <p className="text-sm text-slate-400">
                Die drei Hauptphasen der Pipeline nutzen die gespeicherten Logs aus{' '}
                <code className="rounded bg-slate-900 px-1 py-0.5 text-[11px] text-slate-300">
                  data/process-log.jsonl
                </code>
                . Tippe auf eine Karte, um alle Einträge zu sehen.
              </p>
            </div>
            {isLoading && (
              <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs uppercase tracking-[0.35em] text-slate-400">
                Lädt…
              </span>
            )}
          </div>

          <section className="grid gap-y-16 md:grid-cols-[220px_1fr] md:gap-x-12">
            {stepCards.map(({ index, step, logs: stepLogs, status }) => {
              const isActive = status === 'running';
              const isDone = status === 'done';
              const isError = status === 'error';
              const isLast = index === stepCards.length - 1;
              const lastLog = stepLogs[stepLogs.length - 1];
              const displayLog = (() => {
                if (lastLog) return lastLog.message;
                if (isActive) return '⏳ Wird ausgeführt…';
                if (isDone) return '✅ Schritt abgeschlossen.';
                if (isError) return '❌ Schritt mit Fehler beendet.';
                return '⏳ Noch nicht gestartet.';
              })();

              const connectorFill =
                status === 'done' ? 100 : status === 'running' ? 55 : status === 'error' ? 20 : 0;

              return (
                <Fragment key={step.id}>
                  <div className="relative flex flex-col items-center pb-20 md:pb-24">
                    <div
                      className={[
                        'flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-semibold transition-all duration-500',
                        isError
                          ? 'border-rose-400 bg-rose-500/20 text-rose-100'
                          : isDone
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                            : isActive
                              ? 'border-sky-400 bg-sky-500/20 text-sky-100 animate-pulse'
                              : 'border-slate-700 bg-slate-900 text-slate-300',
                      ].join(' ')}
                    >
                      {step.icon}
                    </div>

                    {!isLast && (
                      <div className="absolute left-1/2 top-16 bottom-[-6rem] w-[3px] -translate-x-1/2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="absolute inset-x-0 top-0 w-full bg-gradient-to-b from-cyan-400 via-sky-400 to-blue-500 transition-all duration-700"
                          style={{ height: `${connectorFill}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <article
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedStepId(step.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedStepId(step.id);
                      }
                    }}
                    className={[
                      'relative cursor-pointer rounded-2xl border px-6 py-7 shadow-lg transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:hover:-translate-y-1',
                      isError
                        ? 'border-rose-500/60 bg-rose-500/10 shadow-rose-900/40'
                        : isActive
                          ? 'border-sky-400/60 bg-slate-900/70 shadow-sky-900/60'
                          : isDone
                            ? 'border-emerald-500/40 bg-slate-900/60'
                            : 'border-slate-800 bg-slate-900/40 opacity-80',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-50">
                          {index + 1}. {step.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">{step.description}</p>
                      </div>

                      <span
                        className={[
                          'shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest',
                          STATUS_STYLES[status],
                        ].join(' ')}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>

                    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm leading-relaxed text-slate-200">
                      {displayLog}
                    </div>

                    <p className="mt-3 text-[11px] uppercase tracking-[0.35em] text-slate-500">
                      {stepLogs.length} Log-Einträge
                    </p>
                  </article>
                </Fragment>
              );
            })}
          </section>

          {!isLoading && !hasAnyLogs && (
            <div className="mt-16 rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-slate-400">
              Noch keine Logs vorhanden. Starte die Pipeline, um neue Einträge zu erzeugen.
            </div>
          )}
        </section>

        <ProcessSummary summaryData={pipelineState.summaryData} />
      </div>

      {selectedStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
          onClick={() => setSelectedStepId(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl border border-slate-800/70 bg-slate-900/95 p-6 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedStepId(null)}
              className="absolute right-4 top-4 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
            >
              Schließen
            </button>

            <h3 className="text-lg font-semibold text-slate-50">
              {selectedStep.index + 1}. {selectedStep.step.title}
            </h3>
            <p className="mt-1 text-sm text-slate-400">{selectedStep.step.description}</p>

            <div className="mt-6 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4">
              {selectedStep.logs.length === 0 ? (
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6 text-center text-slate-400">
                  Keine Logs in diesem Schritt.
                </div>
              ) : (
                <ul className="space-y-3">
                  {selectedStep.logs.map((log, idx) => (
                    <li
                      key={`${selectedStep.step.id}-${idx}`}
                      className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.35em] text-slate-500">
                        <span className="font-mono text-slate-400">
                          {log.timestamp ?? '–'}
                        </span>
                        <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2 py-0.5 font-semibold text-slate-300">
                          {log.level}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-50">{log.message}</p>

                      {log.data && Object.keys(log.data).length > 0 && (
                        <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-[11px] leading-relaxed text-slate-300">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
