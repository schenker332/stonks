// src/components/OcrSection.tsx
'use client';
import { useState } from 'react';

interface OcrSectionProps {
  onOcrComplete: () => void;  // Callback wenn OCR fertig ist
}

export function OcrSection({ onOcrComplete }: OcrSectionProps) {
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrError, setOcrError] = useState('');

  const handleOcr = async () => {
    // 1. Python-Script im Hintergrund starten (API-Call)
    fetch('/api/ocr/process', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('API-Call Fehler:', err));
    
    // 2. Sofort zur Debug-Seite weiterleiten (ohne auf Response zu warten)
    window.location.href = '/debug';
  };

  return (
  <div className="mb-6 p-4 rounded-lg shadow" style={{ background: '#D89986' }}>
      <h2 className="text-lg font-semibold mb-3 text-gray-800">📷 OCR Transaktions-Import</h2>
      
      <div className="flex gap-3">
        <button
          onClick={handleOcr}
          disabled={ocrLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            ocrLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
          }`}
        >
          {ocrLoading ? '🔄 Verarbeitung läuft...' : '🚀 OCR starten'}
        </button>
        
        <button
          onClick={() => window.location.href = '/debug'}
          className="px-6 py-3 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg transition-all"
        >
          🔍 Debug-Monitor
        </button>
      </div>
      
      {/* Status Messages */}
      {ocrStatus && (
        <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded text-blue-800">
          {ocrStatus}
        </div>
      )}
      
      {ocrError && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-red-800">
          {ocrError}
        </div>
      )}
    </div>
  );
}