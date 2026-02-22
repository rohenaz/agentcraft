import { NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { spawnSync } from 'child_process';
import { listPacks, walkPackDir, WAVEFORM_CACHE } from '@/lib/packs';
import type { SoundAsset } from '@/lib/types';

const BARS = 16;
const FALLBACK = [5, 7, 4, 9, 6, 8, 3, 7, 5, 8, 4, 6, 7, 5, 8, 4];

function computeWaveform(filePath: string): number[] {
  const result = spawnSync('ffmpeg', [
    '-i', filePath, '-ac', '1', '-ar', '1000', '-f', 'f32le', '-',
  ], { maxBuffer: 1024 * 1024 * 4 });
  if (result.status !== 0 || !result.stdout?.length) return FALLBACK;
  const buf = result.stdout as Buffer;
  const samples = buf.length / 4;
  const blockSize = Math.floor(samples / BARS);
  const values: number[] = [];
  for (let i = 0; i < BARS; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(buf.readFloatLE((i * blockSize + j) * 4));
    }
    values.push(sum / blockSize);
  }
  const max = Math.max(...values, 0.0001);
  return values.map((v) => Math.max(1, Math.round((v / max) * 10)));
}

async function loadCache(): Promise<Record<string, number[]>> {
  try { return JSON.parse(await readFile(WAVEFORM_CACHE, 'utf-8')); }
  catch { return {}; }
}

async function saveCache(cache: Record<string, number[]>) {
  await mkdir(dirname(WAVEFORM_CACHE), { recursive: true });
  await writeFile(WAVEFORM_CACHE, JSON.stringify(cache), 'utf-8');
}

export async function GET() {
  try {
    const packs = await listPacks();
    const allFiles: Array<{ relPath: string; absPath: string }> = [];
    for (const pack of packs) {
      const files = await walkPackDir(pack.path, pack.path, pack.id);
      allFiles.push(...files);
    }

    const cache = await loadCache();
    let dirty = false;

    const results: SoundAsset[] = allFiles.map(({ relPath, absPath }) => {
      const internal = relPath.slice(relPath.indexOf(':') + 1);
      const parts = internal.split('/');
      const packId = relPath.slice(0, relPath.indexOf(':'));
      const category = parts.length > 2
        ? `${packId}:${parts.slice(0, -2).join('/')}`
        : `${packId}:${parts[0]}`;
      const subcategory = parts.length > 2 ? parts[parts.length - 2] : '';

      const waveform = cache[relPath] ?? (() => {
        const wf = computeWaveform(absPath);
        cache[relPath] = wf;
        dirty = true;
        return wf;
      })();

      return {
        id: relPath.replace(/\.[^/.]+$/, ''),
        filename: parts[parts.length - 1],
        category,
        subcategory,
        path: relPath,
        waveform,
      };
    });

    if (dirty) await saveCache(cache);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Failed to read sound library' }, { status: 500 });
  }
}
