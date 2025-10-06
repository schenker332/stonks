import { spawn } from 'child_process';
import { NextRequest } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // SSE Headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  // ReadableStream für SSE
  let isClosed = false;
  let pythonProcess: ReturnType<typeof spawn> | null = null;
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper: SSE Nachricht senden (nur wenn Controller noch offen ist)
      const sendEvent = (data: any) => {
        if (isClosed) return; // Verhindere Fehler wenn Controller geschlossen
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Failed to send event:', error);
          isClosed = true;
        }
      };

      try {
        // Python Script Pfad
        const pythonScriptPath = path.join(process.cwd(), 'src', 'python', 'capture_scroll_hq.py');
        const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

        sendEvent({ 
          type: 'info', 
          message: '🚀 Starte Python Capture Script...' 
        });

        // Python Prozess starten - führt capture_and_crop_screenshots() aus
        pythonProcess = spawn(pythonExecutable, [
          '-c',
          'import sys; sys.path.insert(0, "' + path.join(process.cwd(), 'src', 'python') + '"); from capture_scroll_hq import capture_and_crop_screenshots; capture_and_crop_screenshots()'
        ]);

        // stdout Zeile für Zeile lesen
        let stdoutBuffer = '';
        pythonProcess.stdout?.on('data', (data) => {
          stdoutBuffer += data.toString();
          
          // Zeilen verarbeiten
          const lines = stdoutBuffer.split('\n');
          stdoutBuffer = lines.pop() || ''; // Letzte unvollständige Zeile behalten

          for (const line of lines) {
            // LOG: Zeilen filtern und als SSE senden
            if (line.includes('LOG:')) {
              try {
                const jsonStr = line.substring(line.indexOf('LOG:') + 4).trim();
                const logData = JSON.parse(jsonStr);
                sendEvent({ 
                  type: 'log', 
                  ...logData
                });
              } catch (e) {
                console.error('Fehler beim Parsen von LOG:', line);
                sendEvent({
                  type: 'error',
                  level: 'error',
                  message: `Parse Error: ${line}`
                });
              }
            } else if (line.trim()) {
              // Andere Ausgaben auch loggen
              console.log('[Python]:', line);
            }
          }
        });

        // stderr loggen
        pythonProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          console.error('[Python Error]:', error);
          sendEvent({ 
            type: 'log',
            level: 'error', 
            message: error 
          });
        });

        // Prozess Ende
        pythonProcess.on('close', (code) => {
          console.log(`Python Prozess beendet mit Code ${code}`);
          sendEvent({ 
            type: 'complete', 
            exitCode: code,
            success: code === 0
          });
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        });

        // Fehler beim Starten
        pythonProcess.on('error', (error) => {
          console.error('Fehler beim Starten des Python Prozesses:', error);
          sendEvent({ 
            type: 'log',
            level: 'error',
            message: `Process Error: ${error.message}` 
          });
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        });

      } catch (error: any) {
        console.error('Stream Fehler:', error);
        sendEvent({ 
          type: 'log',
          level: 'error',
          message: `Stream Error: ${error.message}` 
        });
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      }
    },
    cancel() {
      // Client hat Verbindung getrennt
      isClosed = true;
      console.log('Client disconnected from capture stream');
      // Cleanup: Python Prozess beenden falls noch aktiv
      if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill();
      }
    }
  });

  return new Response(stream, { headers });
}
