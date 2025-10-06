'use client';

import { useEffect, useState } from 'react';

type LogEntry = {
  level: string;
  message: string;
  data?: any;
  timestamp?: string;
};

export default function ProcessPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // EventSource für SSE
    const eventSource = new EventSource('/api/process');

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('🔗 SSE Verbindung hergestellt');
    };

    eventSource.onmessage = (event) => {
      const logEntry = JSON.parse(event.data);
      logEntry.timestamp = new Date().toLocaleTimeString('de-DE');
      
      console.log('📨 Received log:', logEntry); // Debug
      
      setLogs((prev) => [...prev, logEntry]);

      // Nur bei PIPELINE abgeschlossen beenden (nicht bei anderen "abgeschlossen" Messages)
      if (logEntry.message === '✅ Pipeline erfolgreich abgeschlossen' || 
          logEntry.message === '❌ Pipeline mit Fehler beendet') {
        console.log('🏁 Pipeline fertig, schließe Connection');
        setIsRunning(false);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setIsRunning(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-500 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">
            🚀 OCR Pipeline
          </h1>
          
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {isConnected && isRunning && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium">Läuft...</span>
              </div>
            )}
            
            {!isRunning && (
              <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                <span className="text-gray-700 font-medium">✅ Abgeschlossen</span>
              </div>
            )}
          </div>
        </div>

        {/* Logs Container */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Live Logs</h2>
          
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {logs.length === 0 && (
              <div className="text-gray-400 text-center py-8">
                Warte auf Logs...
              </div>
            )}

            {logs.map((log, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{getLevelEmoji(log.level)}</span>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">
                        {log.timestamp}
                      </span>
                      <span className="text-xs font-semibold uppercase">
                        {log.level}
                      </span>
                    </div>
                    
                    <div className="font-medium mb-1">
                      {log.message}
                    </div>
                    
                    {log.data && Object.keys(log.data).length > 0 && (
                      <pre className="text-xs mt-2 p-2 bg-white bg-opacity-50 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            🏠 Zurück zum Dashboard
          </button>
          
          {!isRunning && (
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
            >
              🔄 Erneut ausführen
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
