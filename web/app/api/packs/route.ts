import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { PACKS_DIR, ASSIGNMENTS_PATH } from '@/lib/packs';

interface PackInfo {
  id: string;          // "publisher/name"
  publisher: string;
  name: string;
  description?: string;
  version?: string;
}

async function getInstalledPacks(): Promise<PackInfo[]> {
  const packs: PackInfo[] = [];
  let publishers: string[];
  try {
    publishers = await readdir(PACKS_DIR);
  } catch {
    return packs;
  }
  for (const publisher of publishers) {
    const pubPath = join(PACKS_DIR, publisher);
    const ps = await stat(pubPath).catch(() => null);
    if (!ps?.isDirectory()) continue;
    const names = await readdir(pubPath).catch(() => [] as string[]);
    for (const name of names) {
      const packPath = join(pubPath, name);
      const ns = await stat(packPath).catch(() => null);
      if (!ns?.isDirectory()) continue;
      // Try to read pack.json for metadata
      let description: string | undefined;
      let version: string | undefined;
      try {
        const manifest = JSON.parse(await readFile(join(packPath, 'pack.json'), 'utf-8'));
        // soundsh packs are managed by /api/soundsh — exclude them from the git-pack list
        if (manifest.source === 'soundsh') continue;
        description = manifest.description;
        version = manifest.version;
      } catch { /* no manifest, that's fine */ }
      packs.push({ id: `${publisher}/${name}`, publisher, name, description, version });
    }
  }
  return packs;
}

// GET — list installed packs
export async function GET() {
  const packs = await getInstalledPacks();
  return NextResponse.json(packs);
}

// POST { repo: "publisher/name" } — install a pack
export async function POST(req: NextRequest) {
  try {
    const { repo } = await req.json();
    if (!repo || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
      return NextResponse.json({ error: 'Invalid repo format' }, { status: 400 });
    }
    const [publisher, name] = repo.split('/');
    const dest = join(PACKS_DIR, publisher, name);
    const url = `https://github.com/${repo}`;
    // mkdir publisher dir
    spawnSync('mkdir', ['-p', join(PACKS_DIR, publisher)]);
    const result = spawnSync('git', ['clone', url, dest], { timeout: 60000 });
    if (result.status !== 0) {
      return NextResponse.json({ error: 'Clone failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Install failed' }, { status: 500 });
  }
}

// DELETE { repo: "publisher/name" } — remove a pack
export async function DELETE(req: NextRequest) {
  try {
    const { repo } = await req.json();
    if (!repo || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
      return NextResponse.json({ error: 'Invalid repo format' }, { status: 400 });
    }
    const [publisher, name] = repo.split('/');
    const dest = join(PACKS_DIR, publisher, name);
    spawnSync('rm', ['-rf', dest]);
    // Clean stale assignments pointing at this pack
    try {
      const raw = JSON.parse(await readFile(ASSIGNMENTS_PATH, 'utf-8'));
      const prefix = `${publisher}/${name}:`;
      let changed = false;
      for (const [event, value] of Object.entries(raw.global ?? {})) {
        if (typeof value === 'string' && value.startsWith(prefix)) {
          delete raw.global[event];
          changed = true;
        }
      }
      if (changed) await writeFile(ASSIGNMENTS_PATH, JSON.stringify(raw, null, 2));
    } catch { /* assignments file missing or malformed — ignore */ }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Remove failed' }, { status: 500 });
  }
}

// PATCH { repo: "publisher/name" } — update a pack (git pull)
export async function PATCH(req: NextRequest) {
  try {
    const { repo } = await req.json();
    if (!repo || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
      return NextResponse.json({ error: 'Invalid repo format' }, { status: 400 });
    }
    const [publisher, name] = repo.split('/');
    const dest = join(PACKS_DIR, publisher, name);
    // Guard: refuse to git-pull on non-git directories (e.g. soundsh packs)
    const gitCheck = spawnSync('git', ['-C', dest, 'rev-parse', '--git-dir'], { timeout: 5000 });
    if (gitCheck.status !== 0) {
      return NextResponse.json({ error: 'Not a git repository' }, { status: 400 });
    }
    const result = spawnSync('git', ['-C', dest, 'pull'], { timeout: 30000 });
    if (result.status !== 0) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
