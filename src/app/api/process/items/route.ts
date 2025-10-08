import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'ocr-latest.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ items: parsed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to read ocr-latest.json', error);
    return NextResponse.json({ items: [] }, { headers: { 'Cache-Control': 'no-store' }, status: 500 });
  }
}

