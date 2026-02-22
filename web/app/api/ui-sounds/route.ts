import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const UI_DIR = join(homedir(), '.agentcraft', 'sounds', 'ui');
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);

interface UISound {
  path: string;     // relative to ~/.agentcraft/sounds/, e.g. "ui/sc2/click.mp3"
  filename: string; // e.g. "click.mp3"
  group: string;    // e.g. "sc2"
}

async function scanDir(dir: string, base: string): Promise<UISound[]> {
  const results: UISound[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }
  for (const entry of entries.sort()) {
    const full = join(dir, entry);
    const s = await stat(full).catch(() => null);
    if (!s) continue;
    if (s.isDirectory()) {
      results.push(...await scanDir(full, `${base}/${entry}`));
    } else {
      const ext = entry.toLowerCase().slice(entry.lastIndexOf('.'));
      if (AUDIO_EXTS.has(ext)) {
        const rel = `${base}/${entry}`;
        const group = base.replace('ui/', '');
        results.push({ path: rel, filename: entry, group });
      }
    }
  }
  return results;
}

export async function GET() {
  const sounds = await scanDir(UI_DIR, 'ui');
  return NextResponse.json(sounds);
}
