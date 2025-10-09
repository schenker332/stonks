'use client';

import { useRouter } from 'next/navigation';

export function OcrSection() {
  const router = useRouter();

  return (
    <div className="mb-6 rounded-2xl border border-[#e6dcff] bg-white/85 p-6 text-[#2c1f54] shadow-[0_20px_60px_rgba(211,165,248,0.22)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#341b64]">⚙️ Process</h2>
        </div>

        <button
          type="button"
          onClick={() => router.push('/process')}
          className="rounded-full border border-[#d3a5f8] bg-[#d3a5f8]/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-[#54348d] transition-all duration-300 hover:border-[#c897f6] hover:bg-[#d3a5f8]/30 hover:text-[#36215f]"
        >
          🔍 Process ansehen
        </button>
      </div>
    </div>
  );
}
