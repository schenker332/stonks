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
      <section className="rounded-2xl border border-[#d4c4ff] bg-gradient-to-br from-white via-[#f6f0ff] to-[#ede3ff] p-6 shadow-[0_25px_70px_rgba(211,165,248,0.2)]">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-full bg-[#d3a5f8]/25 p-2">
            <span className="text-2xl">📊</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#2c1f54]">Pipeline Summary</h2>
            <p className="text-xs text-[#8f73c4]">
              Übersicht der wichtigsten Metriken
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Finanzguru Fenster */}
          {summaryData.window && (
            <div className="group rounded-xl border border-[#e6dcff] bg-white/80 p-4 transition-all duration-300 hover:border-[#bda4f6] hover:bg-[#f7efff]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">🖥️</span>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-[#4d3684]">
                  Finanzguru Fenster
                </h3>
              </div>
              <div className="space-y-1.5 text-xs text-[#6c5a94]">
                <div className="flex justify-between">
                  <span className="text-[#8e7abf]">Position:</span>
                  <span className="font-mono text-[#5a3da8]">
                    x={summaryData.window.x}, y={summaryData.window.y}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e7abf]">Größe:</span>
                  <span className="font-mono text-[#5a3da8]">
                    {summaryData.window.width} × {summaryData.window.height} px
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Zusammengesetztes Bild */}
          {stitchedSummary && (
            <div className="group rounded-xl border border-[#e6dcff] bg-white/80 p-4 transition-all duration-300 hover:border-[#7fd6c3] hover:bg-[#f4fffb]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">🧩</span>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-[#4d3684]">
                  Stitched Image
                </h3>
              </div>
              <div className="space-y-1.5 text-xs text-[#6c5a94]">
                <div className="flex justify-between">
                  <span className="text-[#8e7abf]">Breite:</span>
                  <span className="font-mono text-emerald-600">
                    {stitchedSummary.width} px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e7abf]">Höhe:</span>
                  <span className="font-mono text-emerald-600">
                    {stitchedSummary.height} px
                  </span>
                </div>
              </div>
              {stitchedSummary.imageUrl && (
                <button
                  onClick={handleStitchedPreview}
                  className="mt-4 w-full rounded-lg border border-emerald-400/50 bg-emerald-100/50 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 transition-colors duration-300 hover:border-emerald-400 hover:bg-emerald-200 hover:text-emerald-800"
                >
                  stitched.png ansehen
                </button>
              )}
            </div>
          )}

          {/* OCR Auswertung */}
          {ocrSummary && (
            <div className="group rounded-xl border border-[#e6dcff] bg-white/80 p-4 transition-all duration-300 hover:border-[#d3a5f8] hover:bg-[#f8f1ff]">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">🧮</span>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-[#4d3684]">
                  OCR Auswertung
                </h3>
              </div>
              <div className="space-y-1.5 text-xs text-[#6c5a94]">
                <div className="flex justify-between">
                  <span className="text-[#8e7abf]">Erkannte Einträge:</span>
                  <span className="font-mono text-[#c26ef4]">
                    {ocrSummary.totalItems ?? '–'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8e7abf]">Erstes Datum:</span>
                  <span className="font-mono text-[#c26ef4]">
                    {ocrSummary.firstDateFound
                      ? ocrSummary.firstDate || '—'
                      : 'nicht erkannt'}
                  </span>
                </div>
              </div>
              {ocrSummary.resultImageUrl && (
                <button
                  onClick={handleOcrPreview}
                  className="mt-4 w-full rounded-lg border border-[#d3a5f8] bg-[#d3a5f8]/30 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#3d2666] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#d3a5f8]/40 hover:text-[#2a184a]"
                >
                  ocr_result.png ansehen
                </button>
              )}
            </div>
          )}

          {/* Transaktionsboxen */}
          {boxesSummary && (
            <div className="group rounded-xl border border-[#e6dcff] bg-white/80 p-4 transition-all duration-300 hover:border-[#f6c981] hover:bg-[#fff9f0] sm:col-span-2 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-[#4d3684]">
                    Transaktionen ({boxesSummary.count} gefunden)
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                <p className="mb-3 text-xs text-[#8e7abf]">
                  Erste {Math.min(5, boxesSummary.boxes.length)} Boxen mit Position
                  & Größe:
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {boxesSummary.boxes.map((box, idx) => (
                    <div
                      key={`${box.x}-${box.y}-${idx}`}
                      className="group/box rounded-lg border border-[#f5d18d] bg-gradient-to-br from-[#fff3d7] to-[#f5ecff] p-3 shadow-[0_12px_36px_rgba(245,209,141,0.28)] transition-all duration-300 hover:border-[#f0be63] hover:from-[#ffe8ba] hover:shadow-[0_18px_42px_rgba(240,190,99,0.35)]"
                    >
                      <div className="mb-2 text-center">
                        <span className="inline-block rounded-full bg-[#fddaa4] px-2.5 py-0.5 text-xs font-bold text-[#7c4c06] shadow-inner">
                          Box #{idx + 1}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[10px] text-[#6c5a94]">
                        <div className="flex justify-between rounded bg-white/70 px-2 py-1">
                          <span className="text-[#8e7abf]">X:</span>
                          <span className="font-mono font-semibold text-[#c68a2f]">
                            {box.x} px
                          </span>
                        </div>
                        <div className="flex justify-between rounded bg-white/70 px-2 py-1">
                          <span className="text-[#8e7abf]">Y:</span>
                          <span className="font-mono font-semibold text-[#c68a2f]">
                            {box.y} px
                          </span>
                        </div>
                        <div className="flex justify-between rounded bg-white/70 px-2 py-1">
                          <span className="text-[#8e7abf]">W:</span>
                          <span className="font-mono font-semibold text-[#c68a2f]">
                            {box.w} px
                          </span>
                        </div>
                        <div className="flex justify-between rounded bg-white/70 px-2 py-1">
                          <span className="text-[#8e7abf]">H:</span>
                          <span className="font-mono font-semibold text-[#c68a2f]">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1038]/80 p-6 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="relative w-full max-w-5xl rounded-3xl border border-[#e6dcff] bg-white p-6 shadow-[0_30px_90px_rgba(206,185,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closePreview}
              className="absolute right-4 top-4 rounded-full border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#4d3684] transition-colors duration-300 hover:border-[#d3a5f8] hover:bg-[#f5edff]"
            >
              Schließen
            </button>

            <h3 className="text-lg font-semibold text-[#2c1f54]">{preview.title}</h3>

            {preview.meta && preview.meta.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {preview.meta.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-xl border border-[#e6dcff] bg-[#f6f0ff] p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.35em] text-[#8e7abf]">
                      {item.label}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[#3b2a63]">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 max-h-[70vh] overflow-auto rounded-2xl border border-[#e6dcff] bg-[#f7f2ff] p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-xs text-[#6c5a94]">
                  Zoom: {Math.round(zoom * 100)}%
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))))}
                    className="rounded-lg border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#4d3684] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#f5edff]"
                    disabled={zoom <= 0.25}
                  >
                    −
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    className="rounded-lg border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#4d3684] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#f5edff]"
                  >
                    100%
                  </button>
                  <button
                    onClick={() => setZoom((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))))}
                    className="rounded-lg border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#4d3684] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#f5edff]"
                    disabled={zoom >= 4}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-center rounded-xl border border-[#e6dcff] bg-white/90 p-4">
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
