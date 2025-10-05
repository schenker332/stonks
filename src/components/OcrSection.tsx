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
    setOcrLoading(true);
    setOcrError('');
    setOcrStatus('🔍 Starte OCR-Verarbeitung...');
    
    try {
      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { database_result, total_found } = result.data;
        setOcrStatus(`✅ Erfolgreich! ${database_result.saved_count}/${total_found} Transaktionen hinzugefügt`);
        
        // Transaktionen neu laden
        setTimeout(() => {
          onOcrComplete(); // Sagt der Haupt-Komponente: "Lade Transaktionen neu!"
          setOcrStatus('');
        }, 2000);
        
      } else {
        setOcrError(`❌ Fehler: ${result.error}`);
        setOcrStatus('');
      }
    } catch (error) {
      setOcrError(`❌ Verbindungsfehler: ${error}`);
      setOcrStatus('');
    } finally {
      setOcrLoading(false);
    }
  };

  return (
  <div className="mb-6 p-4 rounded-lg shadow" style={{ background: '#D89986' }}>
      <h2 className="text-lg font-semibold mb-3 text-gray-800">📷 OCR Transaktions-Import</h2>
      
      <button
        onClick={handleOcr}
        disabled={ocrLoading}
        className={`px-6 py-3 rounded-lg font-medium transition-all ${
          ocrLoading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {ocrLoading ? '🔄 Verarbeitung läuft...' : '🚀 Screenshots verarbeiten'}
      </button>
      
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