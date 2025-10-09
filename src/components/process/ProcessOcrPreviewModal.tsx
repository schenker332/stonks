'use client';

interface ProcessOcrPreviewModalProps {
  isOpen: boolean;
  imageUrl?: string;
  zoom: number;
  onClose: () => void;
  onZoomChange: (zoom: number) => void;
}

export function ProcessOcrPreviewModal({
  isOpen,
  imageUrl,
  zoom,
  onClose,
  onZoomChange,
}: ProcessOcrPreviewModalProps) {
  if (!isOpen || !imageUrl) return null;

  const handleZoomStep = (delta: number) => {
    const next = Number((zoom + delta).toFixed(2));
    onZoomChange(Math.min(4, Math.max(0.25, next)));
  };

  const handleReset = () => {
    onZoomChange(1);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1b1038]/80 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl border border-[#e6dcff] bg-white p-6 shadow-[0_30px_90px_rgba(206,185,255,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#4d3684] transition-colors duration-300 hover:border-[#d3a5f8] hover:bg-[#f5edff]"
        >
          Schließen
        </button>

        <h3 className="text-lg font-semibold text-[#2c1f54]">OCR Ergebnis</h3>

        <div className="mt-6 max-h-[70vh] overflow-auto rounded-2xl border border-[#e6dcff] bg-[#f7f2ff] p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs text-[#6c5a94]">
              Zoom: {Math.round(zoom * 100)}%
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleZoomStep(-0.25)}
                className="rounded-lg border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#4d3684] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#f5edff]"
                disabled={zoom <= 0.25}
              >
                −
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-[#e6dcff] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#4d3684] transition-colors duration-300 hover:border-[#c897f6] hover:bg-[#f5edff]"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => handleZoomStep(0.25)}
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
              <img src={imageUrl} alt="OCR Ergebnis" className="block" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
