'use client';

import { Fragment } from 'react';

type StepId = 'capture' | 'stitch' | 'ocr';
type StepStatus = 'idle' | 'running' | 'done' | 'error';

type LogEntry = {
  message: string;
  level: string;
  data?: Record<string, unknown>;
  timestamp?: string;
};

type StepConfig = {
  id: StepId;
  title: string;
  description: string;
  icon: string;
};

type StepCard = {
  index: number;
  step: StepConfig;
  logs: LogEntry[];
  status: StepStatus;
};

interface ProcessPipelineStepsProps {
  isLoading: boolean;
  stepCards: StepCard[];
  statusLabels: Record<StepStatus, string>;
  statusStyles: Record<StepStatus, string>;
  onSelectStep: (stepId: StepId) => void;
}

export function ProcessPipelineSteps({
  isLoading,
  stepCards,
  statusLabels,
  statusStyles,
  onSelectStep,
}: ProcessPipelineStepsProps) {
  return (
    <section className="rounded-3xl border border-[#e6dcff] bg-white/85 p-6 shadow-[0_25px_70px_rgba(203,179,255,0.2)]">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
        {isLoading && (
          <span className="rounded-full border border-[#d9cfff] bg-white px-3 py-1 text-xs uppercase tracking-[0.35em] text-[#7f6ab7]">
            Lädt…
          </span>
        )}
      </div>

      <section className="grid gap-y-16 md:grid-cols-[220px_1fr] md:gap-x-12">
        {stepCards.map(({ index, step, logs, status }) => {
          const isActive = status === 'running';
          const isDone = status === 'done';
          const isError = status === 'error';
          const isLast = index === stepCards.length - 1;
          const lastLog = logs[logs.length - 1];
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
                      ? 'border-rose-300 bg-rose-100 text-rose-700'
                      : isDone
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                        : isActive
                          ? 'border-[#d3a5f8] bg-[#d3a5f8]/20 text-[#36215f] animate-pulse'
                          : 'border-[#d9cfff] bg-white text-[#7f6ab7]',
                  ].join(' ')}
                >
                  {step.icon}
                </div>

                {!isLast && (
                  <div className="absolute left-1/2 top-16 bottom-[-6rem] w-[3px] -translate-x-1/2 overflow-hidden rounded-full bg-[#e2d8ff]">
                    <div
                      className="absolute inset-x-0 top-0 w-full bg-gradient-to-b from-[#d3a5f8] via-[#bca0f9] to-[#947bff] transition-all duration-700"
                      style={{ height: `${connectorFill}%` }}
                    />
                  </div>
                )}
              </div>

              <article
                role="button"
                tabIndex={0}
                onClick={() => onSelectStep(step.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectStep(step.id);
                  }
                }}
                className={[
                  'relative cursor-pointer rounded-2xl border px-6 py-7 transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d3a5f8] sm:hover:-translate-y-1',
                  isError
                    ? 'border-rose-300 bg-rose-50 shadow-[0_20px_50px_rgba(229,130,171,0.25)]'
                    : isActive
                      ? 'border-[#d3a5f8] bg-[#f3e8ff] shadow-[0_20px_50px_rgba(211,165,248,0.28)]'
                      : isDone
                        ? 'border-emerald-300 bg-emerald-50 shadow-[0_20px_50px_rgba(95,210,180,0.25)]'
                        : 'border-[#e6dcff] bg-white/90 opacity-80 shadow-[0_15px_40px_rgba(203,179,255,0.15)]',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#2c1f54]">
                      {index + 1}. {step.title}
                    </h2>
                    <p className="mt-1 text-sm text-[#5a4a80]">{step.description}</p>
                  </div>

                  <span
                    className={[
                      'shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest',
                      statusStyles[status],
                    ].join(' ')}
                  >
                    {statusLabels[status]}
                  </span>
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-[#8e7abf]">Letztes Ereignis</p>
                  <p className="text-sm font-medium text-[#2c1f54]">{displayLog}</p>
                </div>
              </article>
            </Fragment>
          );
        })}
      </section>
    </section>
  );
}
