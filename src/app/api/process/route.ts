// src/app/api/process/route.ts
import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      const logDir = path.join(process.cwd(), 'data');
      const logFile = path.join(logDir, 'process-log.jsonl');

      const safeAppend = async (line: string) => {
        try {
          if (!fs.existsSync(logDir)) {
            await fsp.mkdir(logDir, { recursive: true });
          }
          await fsp.appendFile(logFile, line + '\n', 'utf-8');
        } catch (_) {
          // ignore file write errors to not break SSE
        }
      };

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
            // Forward via SSE
            sendEvent(`data: ${logJson}\n\n`);
            // Persist JSON line
            safeAppend(logJson);
          } else if (line.trim()) {
            // Debug: Zeige auch andere Python-Ausgaben
            const debugLog = {
              level: 'debug',
              message: 'Python Output',
              data: { output: line }
            };
            const json = JSON.stringify(debugLog);
            sendEvent(`data: ${json}\n\n`);
            safeAppend(json);
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
        const json = JSON.stringify(errorLog);
        sendEvent(`data: ${json}\n\n`);
        safeAppend(json);
      });

      // Prozess-Ende
      pythonProcess.on('close', (code) => {
        if (isClosed) return;
        
        const doneLog = {
          level: code === 0 ? 'info' : 'error',
          message: code === 0 ? '✅ Pipeline abgeschlossen' : '❌ Pipeline mit Fehler beendet',
          data: { exitCode: code }
        };
        const json = JSON.stringify(doneLog);
        sendEvent(`data: ${json}\n\n`);
        safeAppend(json);
        
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
