// src/app/api/process/route.ts
import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const sendEvent = (data: string) => {
        if (isClosed) return;
        
        try {
          controller.enqueue(encoder.encode(data));
        } catch (e) {
          // Controller wurde bereits geschlossen (z.B. durch Browser disconnect)
          isClosed = true;
        }
      };

      // Python-Pfade
      const pythonScriptPath = path.join(process.cwd(), 'src', 'python', 'main.py');
      const pythonDir = path.join(process.cwd(), 'src', 'python');
      const pythonExecutable = path.join(process.cwd(), '.venv', 'bin', 'python');

      // Python-Prozess starten mit unbuffered output (-u flag)
      const pythonProcess = spawn(pythonExecutable, ['-u', pythonScriptPath], {
        cwd: pythonDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      // STDOUT verarbeiten (hier kommen die LOG: Messages)
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n');

        lines.forEach((line: string) => {
          if (line.trim().startsWith('LOG:')) {
            const logJson = line.substring(4).trim();
            sendEvent(`data: ${logJson}\n\n`);
          } else if (line.trim()) {
            // Debug: Zeige auch andere Python-Ausgaben
            const debugLog = {
              level: 'debug',
              message: 'Python Output',
              data: { output: line }
            };
            sendEvent(`data: ${JSON.stringify(debugLog)}\n\n`);
          }
        });
      });

      // STDERR verarbeiten (für Python Errors)
      pythonProcess.stderr.on('data', (data) => {
        const errorLog = {
          level: 'error',
          message: 'Python Error',
          data: { error: data.toString() }
        };
        sendEvent(`data: ${JSON.stringify(errorLog)}\n\n`);
      });

      // Prozess-Ende
      pythonProcess.on('close', (code) => {
        if (isClosed) return;
        
        const doneLog = {
          level: code === 0 ? 'info' : 'error',
          message: code === 0 ? '✅ Pipeline abgeschlossen' : '❌ Pipeline mit Fehler beendet',
          data: { exitCode: code }
        };
        sendEvent(`data: ${JSON.stringify(doneLog)}\n\n`);
        
        // Kurz warten bevor wir schließen (damit letzte Events ankommen)
        setTimeout(() => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (e) {
              // Already closed
            }
          }
        }, 100);
      });
    },
    
    cancel() {
      // Wird aufgerufen wenn Browser die Verbindung schließt
      // Python-Prozess läuft aber weiter (das ist ok)
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
