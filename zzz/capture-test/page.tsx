'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  level: string;
  message: string;
  data?: any;
  trace?: string;
  timestamp: string;
}

export default function CaptureTestPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const startCapture = () => {
    setLogs([]);
    setIsRunning(true);
    setIsComplete(false);

    const eventSource = new EventSource('/api/ocr/capture');

    eventSource.onmessage = (event) => {
      try {
        if (!event.data || event.data.trim() === '') {
          console.warn('Received empty event data');
          return;
        }
        
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
        // Structured Log Entry
        setLogs(prev => [...prev, {
          level: data.level,
          message: data.message,
          data: data.data,
          trace: data.trace,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else if (data.type === 'info') {
        // Info message
        setLogs(prev => [...prev, {
          level: 'info',
          message: data.message,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else if (data.type === 'complete') {
        // Process finished
        setIsRunning(false);
        setIsComplete(true);
        setLogs(prev => [...prev, {
          level: data.success ? 'info' : 'error',
          message: `✅ Prozess beendet (Exit Code: ${data.exitCode})`,
          timestamp: new Date().toLocaleTimeString()
        }]);
        eventSource.close();
      }
      } catch (error) {
        console.error('Error parsing SSE message:', error, 'Raw data:', event.data);
        setLogs(prev => [...prev, {
          level: 'error',
          message: `Failed to parse message: ${event.data}`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsRunning(false);
      setLogs(prev => [...prev, {
        level: 'error',
        message: '❌ Verbindung zum Server verloren',
        timestamp: new Date().toLocaleTimeString()
      }]);
      eventSource.close();
    };
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-300 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-300 text-blue-800';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📸 Capture & Crop Test Monitor
          </h1>
          <p className="text-gray-600">
            Live-Logging für Screenshot-Aufnahme und Cropping
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <button
            onClick={startCapture}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isRunning ? '🔄 Läuft...' : '🚀 Capture starten'}
          </button>

          {isComplete && (
            <span className="ml-4 text-green-600 font-medium">
              ✅ Abgeschlossen!
            </span>
          )}
        </div>

        {/* Live Logs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📋 Live Logs ({logs.length})
          </h2>

          {logs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">Keine Logs vorhanden</p>
              <p className="text-sm mt-2">Klicke auf "Capture starten" um zu beginnen</p>
            </div>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.map((log, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border-2 ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start gap-3">
                  {/* Level Badge */}
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getLevelBadge(log.level)}`}>
                    {log.level}
                  </span>

                  {/* Message */}
                  <div className="flex-1">
                    <p className="font-medium">{log.message}</p>
                    
                    {/* Additional Data */}
                    {log.data && (
                      <div className="mt-2 text-sm bg-white bg-opacity-50 rounded p-2 font-mono">
                        {Object.entries(log.data).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-bold">{key}:</span> {JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Error Trace */}
                    {log.trace && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-semibold">
                          🔍 Stacktrace anzeigen
                        </summary>
                        <pre className="mt-2 text-xs bg-white bg-opacity-50 rounded p-2 overflow-x-auto">
                          {log.trace}
                        </pre>
                      </details>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {log.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
