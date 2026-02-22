import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { resolvePackPath } from '@/lib/packs';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const fullPath = resolvePackPath(path);
    if (!fullPath) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    spawn('afplay', [fullPath], { detached: true, stdio: 'ignore' }).unref();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Playback failed' }, { status: 500 });
  }
}
