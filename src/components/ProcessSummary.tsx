// src/components/ProcessSummary.tsx
'use client';

type BoxDetail = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type SummaryData = {
  window?: { x: number; y: number; width: number; height: number };
  stitched?: { width: number; height: number; filesize_mb: number };
  boxes?: { count: number; boxes: BoxDetail[] };
};

interface ProcessSummaryProps {
  summaryData: SummaryData;
}

export function ProcessSummary({ summaryData }: ProcessSummaryProps) {
  const hasData = Object.keys(summaryData).length > 0;

  if (!hasData) return null;

  return (
    <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-slate-950/60 p-6 shadow-xl shadow-purple-900/30">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-full bg-purple-500/20 p-2">
          <span className="text-2xl">📊</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Pipeline Summary</h2>
          <p className="text-xs text-purple-200/70">Übersicht der wichtigsten Metriken</p>
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
        {summaryData.stitched && (
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
                  {summaryData.stitched.width} px
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Höhe:</span>
                <span className="font-mono text-emerald-300">
                  {summaryData.stitched.height} px
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dateigröße:</span>
                <span className="font-mono text-emerald-300">
                  {summaryData.stitched.filesize_mb} MB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transaktionsboxen */}
        {summaryData.boxes && (
          <div className="group rounded-xl border border-slate-700/60 bg-slate-900/70 p-4 transition-all duration-300 hover:border-amber-500/50 hover:bg-slate-900/90 sm:col-span-2 lg:col-span-3">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">📦</span>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                Transaktionen ({summaryData.boxes.count} gefunden)
              </h3>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">
                Erste {Math.min(5, summaryData.boxes.boxes.length)} Boxen mit Position & Größe:
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {summaryData.boxes.boxes.map((box, idx) => (
                  <div 
                    key={idx}
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
                        <span className="font-mono font-semibold text-amber-300">{box.x} px</span>
                      </div>
                      <div className="flex justify-between rounded bg-slate-950/50 px-2 py-1">
                        <span className="text-slate-500">Y:</span>
                        <span className="font-mono font-semibold text-amber-300">{box.y} px</span>
                      </div>
                      <div className="flex justify-between rounded bg-slate-950/50 px-2 py-1">
                        <span className="text-slate-500">W:</span>
                        <span className="font-mono font-semibold text-amber-300">{box.w} px</span>
                      </div>
                      <div className="flex justify-between rounded bg-slate-950/50 px-2 py-1">
                        <span className="text-slate-500">H:</span>
                        <span className="font-mono font-semibold text-amber-300">{box.h} px</span>
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
  );
}
