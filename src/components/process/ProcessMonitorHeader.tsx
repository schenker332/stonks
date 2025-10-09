'use client';

import { ReactNode } from 'react';

type OcrItemSummary = {
  index: number;
};

type OcrSummary = {
  totalItems?: number;
  firstDate?: string;
  firstDateFound?: boolean;
  resultImageUrl?: string;
  items?: OcrItemSummary[];
};

type HeaderStatus =
  | {
      label: string;
      className: string;
    }
  | null;

interface ProcessMonitorHeaderProps {
  formattedLastAdded: string | null;
  fetchError: string | null;
  ocrSummary?: OcrSummary;
  onOpenOcrPreview: () => void;
  onStartPipeline: () => void;
  onNavigateDashboard: () => void;
  isPipelineRunning: boolean;
  headerStatus: HeaderStatus;
  actionSlot?: ReactNode;
}

function resolveOcrTotal(summary?: OcrSummary) {
  if (!summary) return null;
  if (typeof summary.totalItems === 'number') return summary.totalItems;
  if (Array.isArray(summary.items)) return summary.items.length;
  return null;
}

function resolveFirstDate(summary?: OcrSummary) {
  if (!summary) return null;
  if (summary.firstDateFound === false) return 'nicht erkannt';
  if (summary.firstDateFound && !summary.firstDate) return '—';
  return summary.firstDate ?? null;
}

export function ProcessMonitorHeader({
  formattedLastAdded,
  fetchError,
  ocrSummary,
  onOpenOcrPreview,
  onStartPipeline,
  onNavigateDashboard,
  isPipelineRunning,
  headerStatus,
  actionSlot,
}: ProcessMonitorHeaderProps) {
  const ocrTotalItems = resolveOcrTotal(ocrSummary);
  const ocrFirstDate = resolveFirstDate(ocrSummary);
  const hasOcrImage = Boolean(ocrSummary?.resultImageUrl);

  return (
    <header className="flex flex-col gap-6 rounded-3xl border border-[#e6dcff] bg-white/85 p-6 shadow-[0_25px_70px_rgba(203,179,255,0.25)] sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#a17bdc]">Pipeline Control</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#2c1f54]">Process Monitor</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#7f6ab7]">
          {formattedLastAdded && (
            <span className="rounded-full border border-[#d9cfff] bg-white px-3 py-1 font-mono tracking-widest text-[#4d3684]">
              Zuletzt hinzugefügt: {formattedLastAdded}
            </span>
          )}
          {actionSlot}
        </div>

        {fetchError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {fetchError}
          </div>
        )}

        {ocrSummary && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e6dcff] bg-white/90 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#9a8acc]">
                  erkannte einträge
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#4d3684]">
                  {ocrTotalItems ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-[#e6dcff] bg-white/90 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#9a8acc]">erstes datum</p>
                <p className="mt-2 font-mono text-sm text-[#4d3684]">{ocrFirstDate ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-[#e6dcff] bg-white/90 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#9a8acc]">
                  OCR Status
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#4d3684]">
                  {hasOcrImage ? 'Bild verfügbar' : 'Kein Bild'}
                </p>
              </div>
            </div>
            {hasOcrImage && (
              <button
                type="button"
                onClick={onOpenOcrPreview}
                className="w-full rounded-lg border border-[#d3a5f8] bg-[#d3a5f8]/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#3d2666] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#d3a5f8]/35"
              >
                OCR Ergebnisbild ansehen
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:items-end">
        {headerStatus && (
          <div
            className={`flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${headerStatus.className}`}
          >
            <span>{headerStatus.label}</span>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onStartPipeline}
            disabled={isPipelineRunning}
            className={`rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition-colors duration-300 ${
              isPipelineRunning
                ? 'cursor-not-allowed border-[#d9cfff] bg-white text-[#b4a5dd]'
                : 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-200 hover:text-emerald-800'
            }`}
          >
            🚀 OCR starten
          </button>

          <button
            type="button"
            onClick={onNavigateDashboard}
            className="rounded-full border border-[#d9cfff] bg-white/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#4d3684] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#f5edff]"
          >
            🏠 Dashboard
          </button>
        </div>
      </div>
    </header>
  );
}
