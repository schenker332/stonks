// src/app/debug/page.tsx
'use client';

import { ProcessTimeline } from '../../components/ProcessTimeline';

export default function DebugPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          🔍 OCR Verarbeitungs-Monitor
        </h1>
        <p className="text-gray-600 mb-8">
          Live-Ansicht der Screenshot-Verarbeitung mit allen Details
        </p>
        
        <ProcessTimeline />
      </div>
    </main>
  );
}
