import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolvePackPath } from '@/lib/packs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    const soundPath = decodeURIComponent(pathParts.join('/'));
    if (soundPath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const fullPath = resolvePackPath(soundPath);
    if (!fullPath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    const data = await readFile(fullPath);
    const ext = soundPath.split('.').pop()?.toLowerCase();
    const contentType = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : 'audio/mpeg';
    return new NextResponse(data, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
  }
}
