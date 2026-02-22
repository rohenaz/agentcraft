import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export const PACKS_DIR = join(homedir(), '.agentcraft', 'packs');
export const ASSIGNMENTS_PATH = join(homedir(), '.agentcraft', 'assignments.json');
export const WAVEFORM_CACHE = join(homedir(), '.agentcraft', 'waveforms.json');
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);

export interface Pack {
  publisher: string;
  name: string;
  path: string;
  id: string; // "publisher/name"
}

export async function listPacks(): Promise<Pack[]> {
  const packs: Pack[] = [];
  let publishers: string[];
  try {
    publishers = await readdir(PACKS_DIR);
  } catch {
    return packs;
  }
  for (const publisher of publishers) {
    const publisherPath = join(PACKS_DIR, publisher);
    const ps = await stat(publisherPath).catch(() => null);
    if (!ps?.isDirectory()) continue;
    const names = await readdir(publisherPath).catch(() => [] as string[]);
    for (const name of names) {
      const packPath = join(publisherPath, name);
      const ns = await stat(packPath).catch(() => null);
      if (!ns?.isDirectory()) continue;
      packs.push({ publisher, name, path: packPath, id: `${publisher}/${name}` });
    }
  }
  return packs;
}

export function resolvePackPath(soundPath: string): string | null {
  if (!soundPath) return null;
  const colonIdx = soundPath.indexOf(':');
  if (colonIdx === -1) {
    // Legacy path — assume rohenaz/agentcraft-sounds
    return join(PACKS_DIR, 'rohenaz', 'agentcraft-sounds', soundPath);
  }
  const packId = soundPath.slice(0, colonIdx);
  const internal = soundPath.slice(colonIdx + 1);
  if (!packId || !internal || internal.includes('..')) return null;
  const [publisher, name] = packId.split('/');
  if (!publisher || !name) return null;
  return join(PACKS_DIR, publisher, name, internal);
}

export async function walkPackDir(
  dir: string,
  base: string,
  packId: string
): Promise<Array<{ relPath: string; absPath: string }>> {
  const results: Array<{ relPath: string; absPath: string }> = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const abs = join(dir, entry);
    const s = await stat(abs).catch(() => null);
    if (!s) continue;
    if (s.isDirectory()) {
      results.push(...await walkPackDir(abs, base, packId));
    } else {
      const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase();
      if (AUDIO_EXTS.has(ext)) {
        const rel = abs.slice(base.length + 1);
        results.push({ relPath: `${packId}:${rel}`, absPath: abs });
      }
    }
  }
  return results;
}
