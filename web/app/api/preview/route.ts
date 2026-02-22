import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

const SOUND_LIBRARY = join(homedir(), '.agentcraft', 'sounds');

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path || typeof path !== 'string' || path.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const fullPath = join(SOUND_LIBRARY, path);
    spawn('afplay', [fullPath], { detached: true, stdio: 'ignore' }).unref();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Playback failed' }, { status: 500 });
  }
}
