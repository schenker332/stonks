// src/app/api/process/media/[filename]/route.ts
import { NextRequest } from 'next/server';
import path from 'path';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

const mediaRoot = path.join(process.cwd(), 'src', 'python');

const ALLOWED_FILES: Record<string, string> = {
  'stitched.png': path.join(mediaRoot, 'stitched.png'),
  'ocr_result.png': path.join(mediaRoot, 'debug', 'ocr_result.png'),
};

type RouteContext = {
  params: Promise<{ filename: string | string[] }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { filename } = await context.params;
  const key = Array.isArray(filename) ? filename[0] : filename;
  const filePath = ALLOWED_FILES[key];

  if (!filePath) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'no-store',
        'Content-Disposition': `inline; filename="${key}"`,
      },
    });
  } catch (error) {
    console.error('Failed to serve media file', { filename: key, error });
    return new Response('Not found', { status: 404 });
  }
}
