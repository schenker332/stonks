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
    // Direkt zu /process weiterleiten - dort wird die API aufgerufen
    window.location.href = '/process';
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