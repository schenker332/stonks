// src/components/ProcessSummary.tsx
'use client';

import { useEffect, useState } from 'react';

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

type PreviewMeta = { label: string; value: string };
type PreviewContent = { title: string; imageUrl: string; meta?: PreviewMeta[] };

interface ProcessSummaryProps {
  summaryData: SummaryData;
}

export function ProcessSummary({ summaryData }: ProcessSummaryProps) {
  const [preview, setPreview] = useState<PreviewContent | null>(null);
  const [zoom, setZoom] = useState(1);

  // WICHTIG: useEffect muss VOR allen early returns kommen (Rules of Hooks)
  useEffect(() => {
    // Zoom zurücksetzen wenn Preview geöffnet wird
    if (preview) {
      setZoom(1);
    }
  }, [preview]);

  const hasData = Object.keys(summaryData).length > 0;

  if (!hasData) return null;

  const stitchedSummary = summaryData.stitched;
  const boxesSummary = summaryData.boxes;
  const ocrSummary = summaryData.ocr;

  const openPreview = (content: PreviewContent) => setPreview(content);
  const closePreview = () => setPreview(null);

  const handleStitchedPreview = () => {
    if (!stitchedSummary?.imageUrl) return;
    openPreview({
      title: 'Stitched Image',
      imageUrl: stitchedSummary.imageUrl,
      meta: [
        { label: 'Breite', value: `${stitchedSummary.width} px` },
        { label: 'Höhe', value: `${stitchedSummary.height} px` },
      ],
    });
  };

  const handleOcrPreview = () => {
    if (!ocrSummary?.resultImageUrl) return;
    openPreview({
      title: 'ocr_result.png',
      imageUrl: ocrSummary.resultImageUrl,
      meta: [
        { label: 'Erkannte Einträge', value: `${ocrSummary.totalItems ?? 0}` },
        {
          label: 'Erstes Datum',
          value: ocrSummary.firstDateFound
            ? ocrSummary.firstDate || '—'
            : 'nicht erkannt',
        },
      ],
    });
  };

  return (
    <>
      <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-slate-950/60 p-6 shadow-xl shadow-purple-900/30">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-full bg-purple-500/20 p-2">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-50">Pipeline Summary</h2>
            <p className="text-xs text-purple-200/70">
              Übersicht der wichtigsten Metriken
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Finanzguru Fenster */}
          {summaryData.window && (
            <div className="group rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 transition-all duration-300 hover:border-sky-500/50 hover:bg-slate-900/90">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">🖥️</span>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                  Finanzguru Fenster
                </h3>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Position:</span>
                  <span className="font-mono text-sky-300">
                    x={summaryData.window.x}, y={summaryData.window.y}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Größe:</span>
                  <span className="font-mono text-sky-300">
                    {summaryData.window.width} × {summaryData.window.height} px
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Zusammengesetztes Bild */}
          {stitchedSummary && (
            <div className="group rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 transition-all duration-300 hover:border-emerald-500/50 hover:bg-slate-900/90">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">🧩</span>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                  Stitched Image
                </h3>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Breite:</span>
                  <span className="font-mono text-emerald-300">
                    {stitchedSummary.width} px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Höhe:</span>
                  <span className="font-mono text-emerald-300">
                    {stitchedSummary.height} px
                  </span>
                </div>
              </div>
              {stitchedSummary.imageUrl && (
                <button
                  onClick={handleStitchedPreview}
                  className="mt-4 w-full rounded-lg border border-emerald-500/50 bg-emerald-500/10 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200 transition-colors duration-300 hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-100"
                >
                  stitched.png ansehen
                </button>
              )}
            </div>
          )}

          {/* OCR Auswertung */}
          {ocrSummary && (
            <div className="group rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 transition-all duration-300 hover:border-fuchsia-500/50 hover:bg-slate-900/90">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">🧮</span>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                  OCR Auswertung
                </h3>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Erkannte Einträge:</span>
                  <span className="font-mono text-fuchsia-300">
                    {ocrSummary.totalItems ?? '–'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Erstes Datum:</span>
                  <span className="font-mono text-fuchsia-300">
                    {ocrSummary.firstDateFound
                      ? ocrSummary.firstDate || '—'
                      : 'nicht erkannt'}
                  </span>
                </div>
              </div>
              {ocrSummary.resultImageUrl && (
                <button
                  onClick={handleOcrPreview}
                  className="mt-4 w-full rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-200 transition-colors duration-300 hover:border-fuchsia-400 hover:bg-fuchsia-500/20 hover:text-fuchsia-100"
                >
                  ocr_result.png ansehen
                </button>
              )}
            </div>
          )}

          {/* Transaktionsboxen */}
          {boxesSummary && (
            <div className="group rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 transition-all duration-300 hover:border-amber-500/50 hover:bg-slate-900/90 sm:col-span-2 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                    Transaktionen ({boxesSummary.count} gefunden)
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                <p className="mb-3 text-xs text-slate-500">
                  Erste {Math.min(5, boxesSummary.boxes.length)} Boxen mit Position
                  & Größe:
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {boxesSummary.boxes.map((box, idx) => (
                    <div
                      key={`${box.x}-${box.y}-${idx}`}
                      className="group/box rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-slate-950/90 p-3 shadow-lg transition-all duration-300 hover:border-amber-400/60 hover:from-amber-500/20 hover:shadow-amber-900/30"
                    >
                      <div className="mb-2 text-center">
                        <span className="inline-block rounded-full bg-amber-500/30 px-2.5 py-0.5 text-xs font-bold text-amber-200 shadow-inner">
                          Box #{idx + 1}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[10px] text-slate-400">
                        <div className="flex justify-between rounded bg-slate-950/50 px-2 py-1">
                          <span className="text-slate-500">X:</span>
                          <span className="font-mono font-semibold text-amber-300">
                            {box.x} px
                          </span>
                        </div>
                        <div className="flex justify-between rounded bg-slate-950/50 px-2 py-1">
                          <span className="text-slate-500">Y:</span>
                          <span className="font-mono font-semibold text-amber-300">
                            {box.y} px
                          </span>
                        </div>
                        <div className="flex justify-between rounded bg-slate-950/50 px-2 py-1">
                          <span className="text-slate-500">W:</span>
                          <span className="font-mono font-semibold text-amber-300">
                            {box.w} px
                          </span>
                        </div>
                        <div className="flex justify-between rounded bg-slate-950/50 px-2 py-1">
                          <span className="text-slate-500">H:</span>
                          <span className="font-mono font-semibold text-amber-300">
                            {box.h} px
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Preview Overlay */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="relative w-full max-w-5xl rounded-3xl border border-slate-700/70 bg-slate-900/95 p-6 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closePreview}
              className="absolute right-4 top-4 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
            >
              Schließen
            </button>

            <h3 className="text-lg font-semibold text-slate-50">{preview.title}</h3>

            {preview.meta && preview.meta.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {preview.meta.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-xl border border-slate-800/70 bg-slate-950/80 p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-100">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 max-h-[70vh] overflow-auto rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs text-slate-400">
                  Zoom: {Math.round(zoom * 100)}%
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))))}
                    className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
                    disabled={zoom <= 0.25}
                  >
                    −
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
                  >
                    100%
                  </button>
                  <button
                    onClick={() => setZoom((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))))}
                    className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 transition-colors duration-300 hover:border-slate-500 hover:bg-slate-800"
                    disabled={zoom >= 4}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-slate-950/70 flex justify-center p-4">
                <div
                  className="inline-block"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.imageUrl}
                    alt={preview.title}
                    className="block"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
