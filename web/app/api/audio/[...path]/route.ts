import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const SOUND_LIBRARY = join(homedir(), '.agentcraft', 'sounds');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    const relativePath = pathParts.join('/');

    if (relativePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const fullPath = join(SOUND_LIBRARY, relativePath);
    const data = await readFile(fullPath);

    const ext = relativePath.split('.').pop()?.toLowerCase();
    const contentType = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : 'audio/mpeg';

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
  }
}
