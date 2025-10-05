// src/app/api/ocr/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Hilfsfunktion um deutsche Datumsformate zu parsen
  const parseGermanDate = (dateStr: string): Date => {
    if (!dateStr || dateStr.trim() === '') {
      return new Date(); // Fallback zu heute
    }
    
    // Entferne Wochentage und extra Leerzeichen
    let cleanDate = dateStr.replace(/\s*(Mo|Di|Mi|Do|Fr|Sa|So)\.?\s*/g, '').trim();
    
    // Format: "21.07" oder "21.07." -> "21.07.AKTUELLES_JAHR"
    if (/^\d{1,2}\.\d{1,2}\.?$/.test(cleanDate)) {
      const currentYear = new Date().getFullYear(); // Aktuelles Jahr (2025)
      cleanDate = cleanDate.replace(/\.$/, '') + '.' + currentYear;
    }
    
    // Format: "dd.MM.yyyy" zu ISO-Format konvertieren
    const parts = cleanDate.split('.');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      
      // ISO Format: YYYY-MM-DD
      const isoDate = `${year}-${month}-${day}`;
      const parsedDate = new Date(isoDate);
      
      // Prüfen ob Datum gültig ist
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    
    console.log(`⚠️ Konnte Datum nicht parsen: "${dateStr}" -> Fallback zu heute`);
    return new Date(); // Fallback zu heute
  };
  
  try {
    console.log('🔍 OCR Process gestartet...');
    
    // Python-Skript Pfad
    const pythonScriptPath = path.join(process.cwd(), 'src', 'python', 'main.py');
    const pythonDir = path.join(process.cwd(), 'src', 'python');
    
    // Python executable - verwende .venv oder system python
    const pythonExecutable = path.join(process.cwd(), '.venv', 'bin', 'python');
    
    console.log('📁 Python Script Path:', pythonScriptPath);
    console.log('📁 Working Directory:', pythonDir);
    console.log('🐍 Python Executable:', pythonExecutable);
    
    // Python-Prozess starten
    const pythonProcess = spawn(pythonExecutable, [pythonScriptPath], {
      cwd: pythonDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let pythonOutput = '';
    let pythonError = '';
    
    // Python Output sammeln
    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
    });
    
    // Warten bis Python-Prozess fertig ist
    const result = await new Promise<{success: boolean, data?: any, error?: string}>(async (resolve) => {
      pythonProcess.on('close', async (code) => {
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`🐍 Python Prozess beendet mit Code: ${code}`);
        console.log(`⏱️  Ausführungszeit: ${executionTime}s`);
        
        if (code === 0) {
          try {
            // Versuche JSON aus Python Output zu extrahieren
            console.log('📄 Python Output:', pythonOutput);
            
            // Suche nach JSON zwischen API_JSON_START und API_JSON_END Markern
            const jsonStartMarker = 'API_JSON_START';
            const jsonEndMarker = 'API_JSON_END';
            const startIndex = pythonOutput.indexOf(jsonStartMarker);
            const endIndex = pythonOutput.indexOf(jsonEndMarker);
            
            let jsonData = null;
            
            if (startIndex !== -1 && endIndex !== -1) {
              const jsonString = pythonOutput.substring(
                startIndex + jsonStartMarker.length, 
                endIndex
              ).trim();
              try {
                jsonData = JSON.parse(jsonString);
              } catch (e) {
                console.error('❌ JSON Parse Error zwischen Markern:', e);
              }
            }
            
            // Fallback: Versuche die letzte Zeile als JSON zu parsen
            if (!jsonData) {
              const lines = pythonOutput.trim().split('\n');
              for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('{') && line.endsWith('}')) {
                  try {
                    jsonData = JSON.parse(line);
                    break;
                  } catch (e) {
                    continue;
                  }
                }
              }
            }
            
            if (jsonData) {
              // OCR erfolgreich - jetzt in Datenbank speichern
              console.log('💾 Speichere OCR-Ergebnisse in Datenbank...');
              
              const items = jsonData.items || [];
              let savedCount = 0;
              const errors = [];
              
              // Alle Transaktionen in DB speichern
              for (const item of items) {
                try {
                  // Datum parsen
                  const parsedDate = parseGermanDate(item.date);
                  
                  // Preis parsen
                  let price = 0;
                  if (item.price) {
                    const priceStr = item.price.replace(/[^\d,-]/g, '').replace(',', '.');
                    price = parseFloat(priceStr) || 0;
                    // Negative Werte für Ausgaben (falls nicht schon negativ)
                    if (price > 0) price = -price;
                  }
                  
                  await prisma.transaction.create({
                    data: {
                      date: parsedDate,
                      name: item.name || 'Unbekannt',
                      category: item.category || '',
                      price: price,
                      tag: item.tag || '',
                      description: item.name || 'Unbekannt',
                      amount: price,
                      type: 'expense', // Default zu expense, da es Bank-Transaktionen sind
                    }
                  });
                  savedCount++;
                  console.log(`✅ Gespeichert: ${item.name} (${item.category}) - ${item.date} -> ${parsedDate.toISOString().split('T')[0]} - ${price}€ [${item.tag}]`);
                } catch (dbError) {
                  console.error('❌ DB Error für Item:', item, dbError);
                  errors.push(`Fehler bei: ${item.name} - ${dbError}`);
                }
              }
              
              console.log(`✅ ${savedCount}/${items.length} Transaktionen in DB gespeichert`);
              
              resolve({
                success: true,
                data: {
                  ...jsonData,
                  execution_time: `${executionTime}s`,
                  python_logs: pythonOutput,
                  database_result: {
                    total_items: items.length,
                    saved_count: savedCount,
                    errors: errors
                  }
                }
              });
            } else {
              // Fallback: Erstelle JSON aus Output
              resolve({
                success: true,
                data: {
                  items: [],
                  first_date: null,
                  total_found: 0,
                  execution_time: `${executionTime}s`,
                  python_logs: pythonOutput,
                  message: 'OCR ausgeführt, aber keine strukturierten Daten gefunden'
                }
              });
            }
          } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            resolve({
              success: false,
              error: `JSON Parse Fehler: ${parseError}`,
              data: {
                execution_time: `${executionTime}s`,
                python_logs: pythonOutput
              }
            });
          }
        } else {
          console.error('❌ Python Error:', pythonError);
          resolve({
            success: false,
            error: `Python Prozess Fehler (Code ${code}): ${pythonError}`,
            data: {
              execution_time: `${executionTime}s`,
              python_logs: pythonOutput
            }
          });
        }
      });
      
      // Timeout nach 60 Sekunden
      setTimeout(() => {
        pythonProcess.kill();
        resolve({
          success: false,
          error: 'Python Prozess Timeout (60s)'
        });
      }, 60000);
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        debug: result.data
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ API Route Error:', error);
    return NextResponse.json({
      success: false,
      error: `API Fehler: ${error}`,
      execution_time: `${((Date.now() - startTime) / 1000).toFixed(1)}s`
    }, { status: 500 });
  }
}