// src/app/api/process/logs/route.ts
import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(_req: NextRequest) {
  const logFile = path.join(process.cwd(), 'data', 'process-log.jsonl');
  try {
    if (!fs.existsSync(logFile)) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    const content = await fs.promises.readFile(logFile, 'utf-8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const json = lines.map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { level: 'debug', message: 'Unparsable line', data: { raw: l } };
      }
    });

    return new Response(JSON.stringify(json), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'read_failed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

