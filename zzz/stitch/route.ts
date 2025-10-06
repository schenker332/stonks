import { spawn } from 'child_process';
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // SSE Headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  // ReadableStream für SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper: SSE Nachricht senden
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Python Script Pfad
        const pythonDir = path.join(process.cwd(), 'src', 'python');
        const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

        // Python Code der stitch_overlap importiert und ausführt
        const pythonCode = `
import sys
import os
import glob
sys.path.insert(0, '${pythonDir}')
from stitch_overlap import stitch_scroll_sequence

# Bilder aus Ordner laden
cropped_dir = os.path.join('${pythonDir}', 'shots_cropped')
cropped_pattern = os.path.join(cropped_dir, 'cropped_*.png')
available_cropped = sorted(glob.glob(cropped_pattern))
output_path = os.path.join('${pythonDir}', 'stitched.png')

# Stitching ausführen
result = stitch_scroll_sequence(
    image_paths=available_cropped,
    output_path=output_path
)

print("RESULT:", result)
`;  

        sendEvent({ 
          type: 'info', 
          message: '🚀 Starte Python Stitching Script...' 
        });

        // Python Prozess starten
        const pythonProcess = spawn(pythonExecutable, ['-c', pythonCode]);

        // stdout Zeile für Zeile lesen
        let stdoutBuffer = '';
        pythonProcess.stdout.on('data', (data) => {
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
                
                // Wenn Debug-Bilder vorhanden sind, zu Base64 konvertieren
                if (logData.data?.images) {
                  try {
                    const imagesBase64: any = {};
                    
                    if (logData.data.images.template && fs.existsSync(logData.data.images.template)) {
                      imagesBase64.template = fs.readFileSync(logData.data.images.template).toString('base64');
                    }
                    if (logData.data.images.match && fs.existsSync(logData.data.images.match)) {
                      imagesBase64.match = fs.readFileSync(logData.data.images.match).toString('base64');
                    }
                    if (logData.data.images.result && fs.existsSync(logData.data.images.result)) {
                      imagesBase64.result = fs.readFileSync(logData.data.images.result).toString('base64');
                    }
                    
                    logData.data.imagesBase64 = imagesBase64;
                    delete logData.data.images; // Pfade nicht mitsenden
                  } catch (imgError) {
                    console.error('Fehler beim Laden der Debug-Bilder:', imgError);
                  }
                }
                
                sendEvent({ 
                  type: 'log', 
                  ...logData
                });
              } catch (e) {
                console.error('Fehler beim Parsen von LOG:', line);
              }
            } else if (line.includes('RESULT:')) {
              // Result-Zeile parsen
              try {
                const jsonStr = line.substring(line.indexOf('RESULT:') + 7).trim();
                const result = JSON.parse(jsonStr.replace(/'/g, '"'));
                sendEvent({
                  type: 'log',
                  level: 'info',
                  message: '📊 Stitching-Resultat',
                  data: result
                });
              } catch (e) {
                console.error('Fehler beim Parsen von RESULT:', line);
              }
            } else if (line.trim()) {
              // Andere Ausgaben auch loggen
              console.log('[Python]:', line);
            }
          }
        });

        // stderr loggen
        pythonProcess.stderr.on('data', (data) => {
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
          controller.close();
        });

        // Fehler beim Starten
        pythonProcess.on('error', (error) => {
          console.error('Fehler beim Starten des Python Prozesses:', error);
          sendEvent({ 
            type: 'log',
            level: 'error',
            message: `Process Error: ${error.message}` 
          });
          controller.close();
        });

      } catch (error: any) {
        console.error('Stream Fehler:', error);
        sendEvent({ 
          type: 'log',
          level: 'error',
          message: `Stream Error: ${error.message}` 
        });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers });
}
