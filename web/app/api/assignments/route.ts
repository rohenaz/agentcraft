import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';

const ASSIGNMENTS_PATH = join(homedir(), '.claude', 'sounds', 'assignments.json');

export async function GET() {
  try {
    const data = await readFile(ASSIGNMENTS_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure required keys exist for older assignment files
    if (!parsed.skills) parsed.skills = {};
    if (!parsed.settings) parsed.settings = {};
    if (!parsed.settings.uiTheme) parsed.settings.uiTheme = 'sc2';
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      global: {},
      agents: {},
      skills: {},
      settings: {
        masterVolume: 1.0,
        enabled: true,
        theme: 'terran',
        uiTheme: 'sc2',
        uiSounds: {
          sc2: {
            hover: 'ui/sc-bigbox/set2-move.mp3',
            click: 'ui/sc2/click.mp3',
            error: 'ui/sc2/error.mp3',
          },
          wc3: {
            hover: 'ui/wc3/hover.mp3',
            click: 'ui/wc3/click.mp3',
            error: 'ui/wc3/error.mp3',
          },
        },
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await mkdir(dirname(ASSIGNMENTS_PATH), { recursive: true });
    await writeFile(ASSIGNMENTS_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to write assignments' }, { status: 500 });
  }
}
