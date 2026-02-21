import { NextResponse } from 'next/server';
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { spawnSync } from 'child_process';
import type { SoundAsset } from '@/lib/types';

const SOUND_LIBRARY = join(homedir(), 'code', 'claude-sounds');
const WAVEFORM_CACHE = join(homedir(), '.claude', 'sounds', 'waveforms.json');
const BARS = 16;
const FALLBACK = [5, 7, 4, 9, 6, 8, 3, 7, 5, 8, 4, 6, 7, 5, 8, 4];

function computeWaveform(filePath: string): number[] {
  // Decode to mono f32le PCM at 1000 Hz (massively downsampled — fast, still accurate)
  const result = spawnSync('ffmpeg', [
    '-i', filePath,
    '-ac', '1',          // mono
    '-ar', '1000',       // 1000 Hz sample rate
    '-f', 'f32le',       // raw 32-bit float output
    '-',                 // pipe to stdout
  ], { maxBuffer: 1024 * 1024 * 4 });

  if (result.status !== 0 || !result.stdout?.length) return FALLBACK;

  const buf = result.stdout as Buffer;
  const samples = buf.length / 4; // 4 bytes per f32
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
  try {
    return JSON.parse(await readFile(WAVEFORM_CACHE, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveCache(cache: Record<string, number[]>) {
  await mkdir(dirname(WAVEFORM_CACHE), { recursive: true });
  await writeFile(WAVEFORM_CACHE, JSON.stringify(cache), 'utf-8');
}

async function walkDir(dir: string, base: string): Promise<SoundAsset[]> {
  const assets: SoundAsset[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      assets.push(...await walkDir(fullPath, base));
    } else if (entry.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      const relativePath = fullPath.replace(base + '/', '');
      const parts = relativePath.split('/');
      assets.push({
        id: relativePath.replace(/\.[^/.]+$/, ''),
        filename: parts[parts.length - 1],
        category: parts.slice(0, -2).join('/'),
        subcategory: parts.length >= 2 ? parts[parts.length - 2] : '',
        path: relativePath,
        waveform: FALLBACK,
      });
    }
  }

  return assets;
}

export async function GET() {
  try {
    const assets = await walkDir(SOUND_LIBRARY, SOUND_LIBRARY);
    const cache = await loadCache();

    let dirty = false;
    const results = assets.map((asset) => {
      if (cache[asset.path]) {
        return { ...asset, waveform: cache[asset.path] };
      }
      const waveform = computeWaveform(join(SOUND_LIBRARY, asset.path));
      cache[asset.path] = waveform;
      dirty = true;
      return { ...asset, waveform };
    });

    if (dirty) await saveCache(cache);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Failed to read sound library' }, { status: 500 });
  }
}
