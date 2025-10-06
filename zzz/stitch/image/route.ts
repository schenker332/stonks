import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const raw = searchParams.get('raw') === 'true';

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    // Security: Only allow specific filenames
    if (!filename.match(/^[a-zA-Z0-9_-]+\.png$/)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const pythonDir = path.join(process.cwd(), 'src', 'python');
    const imagePath = path.join(pythonDir, filename);

    // Check if file exists
    try {
      await fs.access(imagePath);
    } catch {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Read the image file
    const imageBuffer = await fs.readFile(imagePath);

    // If raw=true, return just the image
    if (raw) {
      return new NextResponse(imageBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Return the image as a direct response (browser can zoom natively!)
    // Add HTML wrapper to enable ESC key to go back
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: auto;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      cursor: zoom-in;
    }
    img.zoomed {
      max-width: none;
      cursor: zoom-out;
    }
    .info {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      padding: 12px 24px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      color: #333;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 1000;
      animation: fadeIn 0.3s;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .key {
      display: inline-block;
      background: #333;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin: 0 4px;
    }
  </style>
</head>
<body>
  <div class="info">
    📸 <strong>${filename}</strong> • 
    Drücke <span class="key">ESC</span> zum Zurückgehen • 
    <span class="key">Scroll</span> zum Zoomen
  </div>
  <img src="data:image/png;base64,${imageBuffer.toString('base64')}" alt="${filename}" onclick="this.classList.toggle('zoomed')" />
  <script>
    // ESC key to go back
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.history.back();
      }
    });
    
    // Smooth scroll behavior
    document.body.style.overflow = 'auto';
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}
