// src/components/ProcessTimeline.tsx
'use client';

import { useState, useEffect } from 'react';

type StepStatus = 'pending' | 'running' | 'completed' | 'error';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  details?: string[];
  images?: string[];
  progress?: number; // 0-100
  error?: string;
}

const INITIAL_STEPS: ProcessStep[] = [
  {
    id: 'capture',
    title: 'Screenshot-Aufnahme',
    description: 'Screenshots vom Bildschirm aufnehmen',
    status: 'pending',
  },
  {
    id: 'crop',
    title: 'Zuschneiden & Optimieren',
    description: 'Bilder zuschneiden und für OCR vorbereiten',
    status: 'pending',
  },
  {
    id: 'stitch',
    title: 'Bilder zusammenfügen',
    description: 'Überlappende Screenshots zu einem Bild zusammenfügen',
    status: 'pending',
  },
  {
    id: 'ocr',
    title: 'OCR Texterkennung',
    description: 'Text und Transaktionen aus dem Bild extrahieren',
    status: 'pending',
  },
  {
    id: 'database',
    title: 'Datenbank speichern',
    description: 'Transaktionen in der Datenbank speichern',
    status: 'pending',
  },
];

export function ProcessTimeline() {
  const [steps, setSteps] = useState<ProcessStep[]>(INITIAL_STEPS);
  const [isProcessing, setIsProcessing] = useState(false);

  const startProcess = () => {
    setIsProcessing(true);
    // Hier später WebSocket/SSE für echte Updates
    // Momentan nur Demo-Simulation
    simulateProcess();
  };

  const simulateProcess = async () => {
    // Demo: Schritte nacheinander durchlaufen
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSteps(prev => prev.map((step, idx) => {
        if (idx === i) return { ...step, status: 'running' as StepStatus };
        return step;
      }));
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSteps(prev => prev.map((step, idx) => {
        if (idx === i) return { ...step, status: 'completed' as StepStatus };
        return step;
      }));
    }
    setIsProcessing(false);
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <span className="text-green-500 text-2xl">✓</span>;
      case 'running':
        return <span className="text-blue-500 text-2xl animate-spin">⟳</span>;
      case 'error':
        return <span className="text-red-500 text-2xl">✗</span>;
      default:
        return <span className="text-gray-300 text-2xl">○</span>;
    }
  };

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Timeline */}
      <div className="relative">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const showLine = !isLast;
          
          return (
            <div key={step.id} className="relative flex gap-6 pb-8">
              {/* Timeline Line */}
              <div className="relative flex flex-col items-center">
                {/* Icon Circle */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10 ${getStatusColor(step.status)}`}>
                  {getStatusIcon(step.status)}
                </div>
                
                {/* Connecting Line */}
                {showLine && (
                  <div className={`w-1 flex-1 mt-2 transition-all duration-500 ${
                    steps[index + 1]?.status !== 'pending' ? getStatusColor(step.status) : 'bg-gray-200'
                  }`} style={{ minHeight: '60px' }} />
                )}
              </div>

              {/* Content Card */}
              <div className="flex-1 pb-4">
                <div className={`rounded-lg p-4 transition-all duration-300 ${
                  step.status === 'running' 
                    ? 'bg-blue-50 border-2 border-blue-300 shadow-md' 
                    : step.status === 'completed'
                    ? 'bg-green-50 border-2 border-green-300'
                    : step.status === 'error'
                    ? 'bg-red-50 border-2 border-red-300'
                    : 'bg-gray-50 border-2 border-gray-200'
                }`}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {step.description}
                  </p>

                  {/* Status Badge */}
                  {step.status === 'running' && (
                    <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      ⏳ Läuft...
                    </div>
                  )}
                  {step.status === 'completed' && (
                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      ✓ Fertig
                    </div>
                  )}

                  {/* Details (später für echte Daten) */}
                  {step.details && step.details.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {step.details.map((detail, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          • {detail}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress Bar (optional) */}
                  {step.progress !== undefined && step.status === 'running' && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{step.progress}%</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {step.error && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                      {step.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {isProcessing && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <p className="text-blue-800 font-medium">
            🔄 Verarbeitung läuft... Bitte warten Sie.
          </p>
        </div>
      )}
    </div>
  );
}
