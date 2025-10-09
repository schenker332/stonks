'use client';

type StepId = 'capture' | 'stitch' | 'ocr';

type StepConfig = {
  id: StepId;
  title: string;
  description: string;
};

type LogEntry = {
  level: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
};

type SelectedStep = {
  index: number;
  step: StepConfig;
  logs: LogEntry[];
};

interface ProcessStepLogsModalProps {
  selectedStep: SelectedStep | null;
  onClose: () => void;
  formatTimestamp: (value?: string) => string | null;
}

export function ProcessStepLogsModal({
  selectedStep,
  onClose,
  formatTimestamp,
}: ProcessStepLogsModalProps) {
  if (!selectedStep) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1038]/80 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl border border-[#e6dcff] bg-white p-6 shadow-[0_30px_90px_rgba(206,185,255,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#4d3684] transition-colors duration-300 hover:border-[#d3a5f8] hover:bg-[#f5edff]"
        >
          Schließen
        </button>

        <h3 className="text-lg font-semibold text-[#2c1f54]">
          {selectedStep.index + 1}. {selectedStep.step.title}
        </h3>
        <p className="mt-1 text-sm text-[#5a4a80]">{selectedStep.step.description}</p>

        <div className="mt-6 max-h-[70vh] overflow-y-auto rounded-2xl border border-[#e6dcff] bg-[#f7f2ff] p-4">
          {selectedStep.logs.length === 0 ? (
            <div className="rounded-xl border border-[#e6dcff] bg-white p-6 text-center text-[#7f6ab7]">
              Keine Logs in diesem Schritt.
            </div>
          ) : (
            <ul className="space-y-3">
              {selectedStep.logs.map((log, idx) => {
                const renderedTimestamp = formatTimestamp(log.timestamp);

                return (
                  <li
                    key={`${selectedStep.step.id}-${idx}`}
                    className="rounded-xl border border-[#e6dcff] bg-white/90 p-4 shadow-[0_12px_35px_rgba(203,179,255,0.18)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.35em] text-[#8e7abf]">
                      {renderedTimestamp && (
                        <span className="font-mono text-[#4d3684]">{renderedTimestamp}</span>
                      )}
                      <span className="rounded-full border border-[#d9cfff] bg-white px-2 py-0.5 font-semibold text-[#4d3684]">
                        {log.level}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-[#2c1f54]">{log.message}</p>

                    {log.data && Object.keys(log.data).length > 0 && (
                      <pre className="mt-3 overflow-x-auto rounded-lg border border-[#e6dcff] bg-[#f3e8ff] p-3 text-[11px] leading-relaxed text-[#3b2a63]">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
