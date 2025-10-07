'use client';

import { Fragment, useEffect, useState } from 'react';

type Step = {
  id: string;
  title: string;
  description: string;
  logs: string[];
};

type TimelineState = {
  stepIndex: number;
  logIndex: number;
  finished: boolean;
};

const STEP_DEFINITIONS: Step[] = [
  {
    id: 'prep',
    title: 'Vorbereitung',
    description: 'Ordner bereinigen und Arbeitsverzeichnisse vorbereiten',
    logs: [
      '📁 Initialisiere Aufräumen der bestehenden Ordner…',
      '🧹 Lösche alte Screenshots und Crops…',
      '✅ Ordnerstruktur neu erstellt – bereit für Aufnahme.',
    ],
  },
  {
    id: 'capture',
    title: 'Screenshot-Aufnahme',
    description: 'capture_and_crop_screenshots() läuft',
    logs: [
      '🎯 Starte Aufnahme der Scroll-Sequenz…',
      '📸 Screenshot 3/8 aufgenommen…',
      '✂️ Zuschneiden abgeschlossen.',
      '✅ Aufnahme fertig – Dateien liegen in shots/ und shots_cropped/.',
    ],
  },
  {
    id: 'process',
    title: 'Verarbeitung & OCR',
    description: 'stitch_scroll_sequence() & ocr_extract() laufen',
    logs: [
      '🧵 Beginne mit dem Zusammenstitchen der Crops…',
      '🧠 OCR extrahiert Text…',
      '🔍 Prüfe Ergebnisdateien…',
      '✅ Pipeline abgeschlossen – Ergebnis bereit.',
    ],
  },
];

const TICK_MS = 2000;

export default function ProcessMockPage() {
  const [state, setState] = useState<TimelineState>({
    stepIndex: 0,
    logIndex: 0,
    finished: false,
  });

  const currentStep = STEP_DEFINITIONS[state.stepIndex];
  const currentLog = currentStep?.logs[state.logIndex] ?? '';

  useEffect(() => {
    if (state.finished) return;

    const timer = setTimeout(() => {
      setState((prev) => {
        const step = STEP_DEFINITIONS[prev.stepIndex];
        if (!step) {
          return { ...prev, finished: true };
        }

        const nextLogIndex = prev.logIndex + 1;
        const hasMoreLogs = nextLogIndex < step.logs.length;

        if (hasMoreLogs) {
          return { ...prev, logIndex: nextLogIndex };
        }

        const nextStepIndex = prev.stepIndex + 1;
        const hasNextStep = nextStepIndex < STEP_DEFINITIONS.length;

        if (hasNextStep) {
          return { stepIndex: nextStepIndex, logIndex: 0, finished: false };
        }

        return { ...prev, finished: true };
      });
    }, TICK_MS);

    return () => clearTimeout(timer);
  }, [state]);

  const getSegmentFill = (segmentIndex: number) => {
    if (segmentIndex < state.stepIndex) {
      return 100;
    }

    if (segmentIndex > state.stepIndex) {
      return 0;
    }

    const step = STEP_DEFINITIONS[segmentIndex];
    if (!step) return 0;

    const logsInStep = step.logs.length;
    if (logsInStep <= 1) {
      return 0;
    }

    const relative = state.logIndex / (logsInStep - 1);
    return Math.round(Math.min(Math.max(relative, 0), 1) * 100);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 py-12 px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Mock / Prototyp
          </p>
          <h1 className="mt-2 text-4xl font-semibold">
            OCR Pipeline – Timeline Vorschau
          </h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Diese Seite simuliert den Fortschritt der Python-Pipeline und zeigt,
            wie die Logs in einer vertikalen Timeline inszeniert werden könnten.
            Mit echten Daten ersetzen wir später die Dummy-Zeitsteuerung.
          </p>
        </header>

        <section className="grid gap-y-16 md:grid-cols-[220px_1fr] md:gap-x-12">
            {STEP_DEFINITIONS.map((step, index) => {
              const isActive = index === state.stepIndex && !state.finished;
              const isDone = index < state.stepIndex || (index === state.stepIndex && state.finished);
              const isLast = index === STEP_DEFINITIONS.length - 1;

              const displayLog = (() => {
                if (isActive) return currentLog;
                if (isDone) return step.logs[step.logs.length - 1];
                return '⏳ Noch nicht gestartet.';
              })();

              return (
                <Fragment key={step.id}>
                  <div className="relative flex flex-col items-center text-center pb-20 md:pb-24">
                    <div
                      className={[
                        'flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-500',
                        isDone ? 'border-emerald-400 bg-emerald-500/20' : '',
                        isActive ? 'border-sky-400 bg-sky-500/20 animate-pulse' : '',
                        !isActive && !isDone ? 'border-slate-700 bg-slate-900' : '',
                      ].join(' ')}
                    >
                      <span className="text-xl font-semibold">
                        {index + 1}
                      </span>
                    </div>

                    {!isLast && (
                      <div className="absolute left-1/2 top-16 bottom-[-6rem] w-[3px] -translate-x-1/2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="absolute inset-x-0 top-0 w-full bg-gradient-to-b from-cyan-400 via-sky-400 to-blue-500 transition-all duration-700"
                          style={{ height: `${getSegmentFill(index)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <article
                    className={[
                      'relative rounded-2xl border px-6 py-7 shadow-lg transition-all duration-500',
                      isActive
                        ? 'border-sky-400/60 bg-slate-900/70 shadow-sky-900/60'
                        : isDone
                          ? 'border-emerald-500/40 bg-slate-900/60'
                          : 'border-slate-800 bg-slate-900/40 opacity-70',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-50">
                          {step.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          {step.description}
                        </p>
                      </div>

                      <span
                        className={[
                          'shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest',
                          isActive
                            ? 'bg-sky-500/10 text-sky-300 border border-sky-400/50'
                            : isDone
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/50'
                              : 'bg-slate-800 text-slate-400 border border-slate-700',
                        ].join(' ')}
                      >
                        {isActive ? 'Läuft' : isDone ? 'Fertig' : 'Wartet'}
                      </span>
                    </div>

                    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm leading-relaxed text-slate-200">
                      {displayLog}
                    </div>
                  </article>
                </Fragment>
              );
            })}
        </section>
      </div>
    </main>
  );
}
