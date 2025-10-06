'use client';

import { useState } from 'react';

interface LogEntry {
  level: string;
  message: string;
  data?: any;
  trace?: string;
  timestamp: string;
}

export default function StitchTestPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [stitchResult, setStitchResult] = useState<any>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const startStitch = () => {
    setLogs([]);
    setIsRunning(true);
    setIsComplete(false);
    setStitchResult(null);

    const eventSource = new EventSource('/api/ocr/stitch');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'log') {
        // Structured Log Entry
        const logEntry: LogEntry = {
          level: data.level,
          message: data.message,
          data: data.data,
          trace: data.trace,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setLogs(prev => [...prev, logEntry]);
        
        // Wenn es das finale Resultat ist, speichern
        if (data.message?.includes('Stitching-Resultat') && data.data) {
          setStitchResult(data.data);
        }
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
          message: data.success 
            ? `✅ Stitching abgeschlossen (Exit Code: ${data.exitCode})`
            : `❌ Stitching fehlgeschlagen (Exit Code: ${data.exitCode})`,
          timestamp: new Date().toLocaleTimeString()
        }]);
        eventSource.close();
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

  // Match-Score Visualisierung
  const getMatchScoreColor = (score: number) => {
    if (score >= 0.95) return 'text-green-600';
    if (score >= 0.90) return 'text-blue-600';
    if (score >= 0.85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🔗 Stitching Test Monitor
          </h1>
          <p className="text-gray-600">
            Live-Logging für Bild-Stitching mit Match-Scores
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={startStitch}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isRunning 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isRunning ? '🔄 Läuft...' : '🔗 Stitch starten'}
            </button>

            {isComplete && (
              <span className="text-green-600 font-medium">
                ✅ Abgeschlossen!
              </span>
            )}
            
            <a 
              href="/capture-test"
              className="ml-auto px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
            >
              ← Zurück zu Capture
            </a>
          </div>
          
          <p className="mt-3 text-sm text-gray-500">
            ℹ️ Hinweis: Stelle sicher, dass Screenshots vorhanden sind (führe zuerst Capture aus)
          </p>
        </div>

        {/* Stitch Result Summary */}
        {stitchResult && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-green-300">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              📊 Stitching Ergebnis
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Bilder verwendet</p>
                <p className="text-2xl font-bold text-blue-600">{stitchResult.frames_used}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600">Finale Match-Score</p>
                <p className={`text-2xl font-bold ${getMatchScoreColor(stitchResult.last_match_score || 0)}`}>
                  {((stitchResult.last_match_score || 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div 
                className="bg-white rounded-lg p-4 shadow cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 group"
                onClick={() => {
                  const filename = stitchResult.output_path?.split('/').pop();
                  setLightboxImage({
                    src: `/api/ocr/stitch/image?filename=${filename}&raw=true`,
                    title: filename || 'Stitched Image'
                  });
                }}
              >
                <p className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">Output</p>
                <p className="text-xs font-mono text-gray-700 truncate group-hover:text-blue-800 group-hover:font-semibold transition-all">
                  {stitchResult.output_path?.split('/').pop()} 🔍
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Logs */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📋 Live Logs ({logs.length})
          </h2>

          {logs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">Keine Logs vorhanden</p>
              <p className="text-sm mt-2">Klicke auf "Stitch starten" um zu beginnen</p>
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
                    
                    {/* Debug-Bilder Visualisierung */}
                    {log.data?.imagesBase64 && (
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-3 gap-3">
                          {/* Template */}
                          {log.data.imagesBase64.template && (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                                📍 Template-Bereich
                                <span className="text-gray-500 font-normal">(rot)</span>
                              </p>
                              <img 
                                src={`data:image/png;base64,${log.data.imagesBase64.template}`}
                                className="w-full max-h-64 object-contain border-4 border-red-500 rounded shadow-lg hover:scale-105 transition-transform cursor-pointer"
                                alt="Template"
                                title="Unterer Bereich des Base-Images (Template) - Click für Full-Size"
                                onClick={() => setLightboxImage({
                                  src: `data:image/png;base64,${log.data.imagesBase64.template}`,
                                  title: 'Template Full-Size'
                                })}
                              />
                            </div>
                          )}
                          
                          {/* Match */}
                          {log.data.imagesBase64.match && (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                                🎯 Match gefunden
                                <span className="text-gray-500 font-normal">(grün)</span>
                              </p>
                              <img 
                                src={`data:image/png;base64,${log.data.imagesBase64.match}`}
                                className="w-full max-h-64 object-contain border-4 border-green-500 rounded shadow-lg hover:scale-105 transition-transform cursor-pointer"
                                alt="Match"
                                title="Wo das Template im nächsten Bild gefunden wurde - Click für Full-Size"
                                onClick={() => setLightboxImage({
                                  src: `data:image/png;base64,${log.data.imagesBase64.match}`,
                                  title: 'Match Full-Size'
                                })}
                              />
                            </div>
                          )}
                          
                          {/* Result */}
                          {log.data.imagesBase64.result && (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-purple-600 flex items-center gap-1">
                                ✅ Zusammengefügt
                                <span className="text-gray-500 font-normal">(lila Linie)</span>
                              </p>
                              <img 
                                src={`data:image/png;base64,${log.data.imagesBase64.result}`}
                                className="w-full max-h-64 object-contain border-4 border-purple-500 rounded shadow-lg hover:scale-105 transition-transform cursor-pointer"
                                alt="Result"
                                title="Beide Bilder zusammengefügt mit Trennlinie - Click für Full-Size"
                                onClick={() => setLightboxImage({
                                  src: `data:image/png;base64,${log.data.imagesBase64.result}`,
                                  title: 'Result Full-Size'
                                })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Additional Data - Highlight Match Scores */}
                    {log.data && (
                      <div className="mt-2 text-sm bg-white bg-opacity-50 rounded p-2">
                        {Object.entries(log.data)
                          .filter(([key]) => key !== 'imagesBase64') // Bilder nicht in Text anzeigen
                          .map(([key, value]) => {
                          const isMatchScore = key === 'match_score' || key === 'score';
                          const displayValue = isMatchScore && typeof value === 'number' 
                            ? `${(value * 100).toFixed(1)}%`
                            : JSON.stringify(value);
                          
                          return (
                            <div key={key} className={isMatchScore ? 'font-bold' : ''}>
                              <span className="text-gray-600">{key}:</span>{' '}
                              <span className={isMatchScore ? getMatchScoreColor(value as number) : 'font-mono'}>
                                {displayValue}
                              </span>
                            </div>
                          );
                        })}
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

      {/* Full-Screen Image Viewer Modal with Smooth Zoom */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setLightboxImage(null);
              setImageScale(1);
              setImagePosition({ x: 0, y: 0 });
            } else if (e.key === '+' || e.key === '=') {
              setImageScale(s => Math.min(s * 1.2, 10));
            } else if (e.key === '-') {
              setImageScale(s => Math.max(s / 1.2, 0.1));
            } else if (e.key === '0') {
              setImageScale(1);
              setImagePosition({ x: 0, y: 0 });
            }
          }}
          tabIndex={0}
        >
          {/* Top Bar */}
          <div className="bg-black/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-white text-lg font-semibold">📸 {lightboxImage.title}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-mono">
                {(imageScale * 100).toFixed(0)}%
              </span>
              <span className="text-white/60 text-sm">⌘ + Scroll zum Zoomen • Ziehen • Doppelklick</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all"
                onClick={() => setImageScale(s => Math.max(s / 1.3, 0.1))}
                title="Zoom Out"
              >
                🔍−
              </button>
              <button
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all"
                onClick={() => {
                  setImageScale(1);
                  setImagePosition({ x: 0, y: 0 });
                }}
                title="Reset"
              >
                ↺
              </button>
              <button
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-all"
                onClick={() => setImageScale(s => Math.min(s * 1.3, 10))}
                title="Zoom In"
              >
                🔍+
              </button>
              <button
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                onClick={() => {
                  setLightboxImage(null);
                  setImageScale(1);
                  setImagePosition({ x: 0, y: 0 });
                }}
              >
                ✕ <span className="text-xs opacity-60">ESC</span>
              </button>
            </div>
          </div>

          {/* Image Container with Zoom & Pan */}
          <div 
            className="flex-1 overflow-auto bg-black flex items-center justify-center relative"
            onWheel={(e) => {
              // Only zoom if CMD (Mac) or CTRL (Windows/Linux) is pressed
              if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation(); // Stop event from bubbling up
                
                // Slower zoom: less sensitivity
                const delta = e.deltaY > 0 ? 1.03 : 0.97;
                const newScale = Math.max(0.1, Math.min(imageScale * delta, 10));
                
                // Zoom to cursor position
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;
                
                const scaleRatio = newScale / imageScale;
                setImagePosition({
                  x: mouseX - (mouseX - imagePosition.x) * scaleRatio,
                  y: mouseY - (mouseY - imagePosition.y) * scaleRatio,
                });
                
                setImageScale(newScale);
                return false; // Extra prevention
              }
              // Without CMD: normal scroll behavior (handled by overflow-auto)
            }}
            onMouseDown={(e) => {
              if (e.button === 0) { // Left click only
                setIsDragging(true);
                setDragStart({
                  x: e.clientX - imagePosition.x,
                  y: e.clientY - imagePosition.y,
                });
                e.currentTarget.style.cursor = 'grabbing';
              }
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setImagePosition({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y,
                });
              }
            }}
            onMouseUp={() => {
              setIsDragging(false);
              document.body.style.cursor = 'default';
            }}
            onMouseLeave={() => {
              if (isDragging) {
                setIsDragging(false);
              }
            }}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            <img 
              src={lightboxImage.src}
              alt={lightboxImage.title}
              className="max-w-none select-none"
              style={{
                transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                imageRendering: imageScale > 2 ? 'pixelated' : 'auto',
              }}
              onDoubleClick={(e) => {
                if (imageScale === 1) {
                  // Zoom in to cursor position
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left - rect.width / 2;
                  const y = e.clientY - rect.top - rect.height / 2;
                  setImageScale(3);
                  setImagePosition({ x: -x * 2, y: -y * 2 });
                } else {
                  // Reset
                  setImageScale(1);
                  setImagePosition({ x: 0, y: 0 });
                }
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </main>
  );
}
