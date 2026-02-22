# Sound Pack System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement isolated, git-installable sound packs under `~/.agentcraft/packs/<publisher>/<name>/`, with a real `agentcraft` npm CLI and seamless migration from the old flat `~/.agentcraft/sounds/` layout.

**Architecture:** Each pack is a bare directory at `~/.agentcraft/packs/<publisher>/<name>/` — no manifest required. Assignment paths gain a `publisher/name:internal/path` prefix. A shared `web/lib/packs.ts` module handles all resolution so API routes stay thin. The `agentcraft` npm CLI wraps git for install/update/remove and launches the dashboard.

**Tech Stack:** Bun, Next.js 15 App Router, TypeScript, Bash, Node.js (CLI)

---

## Task 1: Save current config as defaults in agentcraft-sounds

Save the user's current `assignments.json` as the starter config shipped with the official pack.

**Files:**
- Create: `~/.agentcraft/packs/rohenaz/agentcraft-sounds/defaults/assignments.json` (after Task 2 migration)
- In agentcraft-sounds repo: create `defaults/assignments.json`

**Step 1: Copy current assignments into the agentcraft-sounds repo**

```bash
mkdir -p ~/code/claude-sounds/defaults
cp ~/.agentcraft/assignments.json ~/code/claude-sounds/defaults/assignments.json
```

**Step 2: Strip agent-specific hooks (keep only global + settings)**

Edit `~/code/claude-sounds/defaults/assignments.json` — keep `global`, `settings`, `skills` but clear `agents` to `{}` since agent names are user-specific.

**Step 3: Commit and push to agentcraft-sounds**

```bash
cd ~/code/claude-sounds
git add defaults/assignments.json
git commit -m "Add default assignments — starter configuration for new installs"
git push
```

---

## Task 2: Migrate local directory structure

Move the existing `~/.agentcraft/sounds/` into the packs layout. The old path disappears; everything lives under `packs/` going forward.

**Step 1: Create packs directory and move sounds**

```bash
mkdir -p ~/.agentcraft/packs/rohenaz
mv ~/.agentcraft/sounds ~/.agentcraft/packs/rohenaz/agentcraft-sounds
```

**Step 2: Verify structure**

```bash
ls ~/.agentcraft/packs/rohenaz/agentcraft-sounds/
# Expected: sc2  wc3  ff7  ff9  apps  classic-os  phones  ui  README.md
```

**Step 3: Update existing assignments.json paths to use pack prefix**

Run this one-liner to prefix all sound paths:

```bash
cd ~/.agentcraft
python3 -c "
import json, re, sys

with open('assignments.json') as f:
    data = json.load(f)

PREFIX = 'rohenaz/agentcraft-sounds:'

def prefix_path(p):
    if p and ':' not in p:
        return PREFIX + p
    return p

def walk(obj):
    if isinstance(obj, dict):
        return {k: walk(v) for k, v in obj.items()}
    if isinstance(obj, str) and obj.endswith(('.mp3', '.wav', '.ogg', '.m4a')):
        return prefix_path(obj)
    return obj

result = walk(data)
with open('assignments.json', 'w') as f:
    json.dump(result, f, indent=2)
print('Done')
"
```

**Step 4: Verify assignments look correct**

```bash
cat ~/.agentcraft/assignments.json | grep -o '"rohenaz/agentcraft-sounds:[^"]*"' | head -5
# Each sound path should now start with rohenaz/agentcraft-sounds:
```

---

## Task 3: Create `web/lib/packs.ts` — shared pack resolution module

All path logic lives here. API routes import from this module.

**Files:**
- Create: `web/lib/packs.ts`

**Step 1: Write the module**

```typescript
// web/lib/packs.ts
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
  path: string; // absolute path to pack root
  id: string;   // "publisher/name"
}

/** List all installed packs */
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

/**
 * Resolve a pack-prefixed path to an absolute filesystem path.
 * Format: "publisher/name:internal/path/to/sound.mp3"
 * Legacy (no prefix): resolved against first installed pack that contains the file.
 */
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

/**
 * Walk a directory recursively, returning all audio files.
 * Returns paths relative to `base`, prefixed with `packId:`.
 */
export async function walkPackDir(
  dir: string,
  base: string,
  packId: string
): Promise<Array<{ relPath: string; absPath: string }>> {
  const results: Array<{ relPath: string; absPath: string }> = [];
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await walkPackDir(abs, base, packId));
    } else {
      const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
      if (AUDIO_EXTS.has(ext)) {
        const rel = abs.slice(base.length + 1); // relative to pack root
        results.push({ relPath: `${packId}:${rel}`, absPath: abs });
      }
    }
  }
  return results;
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd ~/code/agentcraft/web && bunx tsc --noEmit 2>&1 | grep packs
# Should produce no errors
```

---

## Task 4: Update `/api/sounds` route

**Files:**
- Modify: `web/app/api/sounds/route.ts`

**Step 1: Rewrite to use packs.ts**

Replace the entire file:

```typescript
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
      // relPath: "rohenaz/agentcraft-sounds:sc2/terran/session-start/scv-ready.mp3"
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
  } catch (e) {
    return NextResponse.json({ error: 'Failed to read sound library' }, { status: 500 });
  }
}
```

**Step 2: Start dev server and verify sounds load**

```bash
cd ~/code/agentcraft/web && bun dev --port 4040 &
sleep 5
curl -s http://localhost:4040/api/sounds | jq '.[0]'
# Expect: path starts with "rohenaz/agentcraft-sounds:"
```

---

## Task 5: Update `/api/audio` and `/api/preview` routes

**Files:**
- Modify: `web/app/api/audio/[...path]/route.ts`
- Modify: `web/app/api/preview/route.ts`

**Step 1: Update audio route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolvePackPath } from '@/lib/packs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params;
    // Reconstruct the full pack path — URL encodes ":" as %3A
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
```

**Step 2: Update preview route**

```typescript
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
```

---

## Task 6: Update `/api/ui-sounds` route

**Files:**
- Modify: `web/app/api/ui-sounds/route.ts`

**Step 1: Rewrite to scan ui/ in all packs**

```typescript
import { NextResponse } from 'next/server';
import { listPacks, walkPackDir } from '@/lib/packs';

interface UISound {
  path: string;    // pack-prefixed, e.g. "rohenaz/agentcraft-sounds:ui/sc2/click.mp3"
  filename: string;
  group: string;   // e.g. "sc2"
}

export async function GET() {
  const packs = await listPacks();
  const results: UISound[] = [];

  for (const pack of packs) {
    const uiDir = `${pack.path}/ui`;
    const files = await walkPackDir(uiDir, pack.path, pack.id).catch(() => []);
    for (const { relPath } of files) {
      const internal = relPath.slice(relPath.indexOf(':') + 1); // "ui/sc2/click.mp3"
      const parts = internal.split('/');                         // ["ui", "sc2", "click.mp3"]
      if (parts[0] !== 'ui') continue;
      const group = parts[1] ?? '';                              // "sc2"
      results.push({ path: relPath, filename: parts[parts.length - 1], group });
    }
  }

  return NextResponse.json(results);
}
```

---

## Task 7: Update hook script to resolve pack paths

**Files:**
- Modify: `hooks/play-sound.sh`

**Step 1: Replace `LIBRARY` constant and resolution logic**

Replace the `LIBRARY` line and the `FULL=` line at the bottom:

```bash
PACKS="$HOME/.agentcraft/packs"

# ...existing lookup logic unchanged...

[ -z "$SOUND" ] && exit 0

# Resolve pack-prefixed path: "publisher/name:internal/path"
if echo "$SOUND" | grep -q ':'; then
  PACK_ID="${SOUND%%:*}"
  INTERNAL="${SOUND#*:}"
  PUBLISHER="${PACK_ID%%/*}"
  PACKNAME="${PACK_ID##*/}"
  FULL="$PACKS/$PUBLISHER/$PACKNAME/$INTERNAL"
else
  # Legacy path — fall back to rohenaz/agentcraft-sounds
  FULL="$PACKS/rohenaz/agentcraft-sounds/$SOUND"
fi

[ ! -f "$FULL" ] && exit 0
```

**Step 2: Test the hook manually**

```bash
echo '{"hook_event_name":"SessionStart","agent_type":""}' | bash ~/code/agentcraft/hooks/play-sound.sh
# Should play the SessionStart sound
```

---

## Task 8: Update slash command

**Files:**
- Modify: `commands/agentcraft.md`

**Step 1: Update first-run check to use packs/ directory**

Replace the sounds presence check and clone command:

```markdown
Check if the official sound pack is installed:
```bash
ls ~/.agentcraft/packs/rohenaz/agentcraft-sounds 2>/dev/null | head -1
```

If that returned nothing, install it:
```bash
agentcraft pack install rohenaz/agentcraft-sounds 2>/dev/null || \
  git clone https://github.com/rohenaz/agentcraft-sounds ~/.agentcraft/packs/rohenaz/agentcraft-sounds
```
```

Also add `Bash(agentcraft:*)` to `allowed-tools`.

---

## Task 9: Build real `agentcraft` CLI

**Files:**
- Modify: `bin/agentcraft.js`

**Step 1: Write the full CLI**

```javascript
#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const { existsSync, readdirSync, rmSync, statSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');

const PACKS_DIR = join(homedir(), '.agentcraft', 'packs');
const [,, cmd, sub, ...rest] = process.argv;

function ensurePacksDir() {
  require('fs').mkdirSync(PACKS_DIR, { recursive: true });
}

function parsePackId(arg) {
  if (!arg || !arg.includes('/')) {
    console.error(`Error: pack must be "publisher/name", got: ${arg}`);
    process.exit(1);
  }
  const [publisher, name] = arg.split('/');
  return { publisher, name, url: `https://github.com/${publisher}/${name}` };
}

function listPacks() {
  if (!existsSync(PACKS_DIR)) { console.log('No packs installed.'); return []; }
  const packs = [];
  for (const publisher of readdirSync(PACKS_DIR)) {
    const ppath = join(PACKS_DIR, publisher);
    if (!statSync(ppath).isDirectory()) continue;
    for (const name of readdirSync(ppath)) {
      if (statSync(join(ppath, name)).isDirectory()) packs.push(`${publisher}/${name}`);
    }
  }
  return packs;
}

if (cmd === 'pack') {
  if (sub === 'install') {
    const { publisher, name, url } = parsePackId(rest[0]);
    const dest = join(PACKS_DIR, publisher, name);
    if (existsSync(dest)) { console.log(`Already installed: ${publisher}/${name}`); process.exit(0); }
    ensurePacksDir();
    require('fs').mkdirSync(join(PACKS_DIR, publisher), { recursive: true });
    console.log(`Installing ${publisher}/${name} from ${url}...`);
    const r = spawnSync('git', ['clone', url, dest], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('Install failed.'); process.exit(1); }
    console.log(`Installed: ${publisher}/${name}`);

  } else if (sub === 'remove') {
    const { publisher, name } = parsePackId(rest[0]);
    const dest = join(PACKS_DIR, publisher, name);
    if (!existsSync(dest)) { console.error(`Not installed: ${publisher}/${name}`); process.exit(1); }
    rmSync(dest, { recursive: true, force: true });
    console.log(`Removed: ${publisher}/${name}`);

  } else if (sub === 'update') {
    const all = rest[0] === '--all';
    const targets = all ? listPacks() : [rest[0]];
    for (const packId of targets) {
      const { publisher, name } = parsePackId(packId);
      const dest = join(PACKS_DIR, publisher, name);
      if (!existsSync(dest)) { console.error(`Not installed: ${packId}`); continue; }
      console.log(`Updating ${packId}...`);
      spawnSync('git', ['-C', dest, 'pull'], { stdio: 'inherit' });
    }

  } else if (sub === 'list') {
    const packs = listPacks();
    if (!packs.length) { console.log('No packs installed.'); }
    else { console.log('Installed packs:\n' + packs.map(p => `  ${p}`).join('\n')); }

  } else {
    console.log('Usage: agentcraft pack <install|remove|update|list> [publisher/name] [--all]');
  }

} else if (cmd === 'start') {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) { console.error('CLAUDE_PLUGIN_ROOT not set. Run from the Claude Code plugin.'); process.exit(1); }
  execSync(`cd "${pluginRoot}/web" && bun dev --port 4040`, { stdio: 'inherit' });

} else {
  console.log(`AgentCraft CLI

Usage:
  agentcraft pack install <publisher/name>   Install a sound pack
  agentcraft pack remove  <publisher/name>   Remove a sound pack
  agentcraft pack update  <publisher/name>   Update a pack (git pull)
  agentcraft pack update  --all              Update all packs
  agentcraft pack list                       List installed packs
  agentcraft start                           Launch the dashboard

Install the Claude Code plugin:
  claude plugin install agentcraft@rohenaz
`);
}
```

**Step 2: Test locally**

```bash
node ~/code/agentcraft/bin/agentcraft.js pack list
# Should list rohenaz/agentcraft-sounds

node ~/code/agentcraft/bin/agentcraft.js
# Should show usage
```

---

## Task 10: Add `pack.json` to agentcraft-sounds

**Files:**
- Create: `~/code/claude-sounds/pack.json`

```json
{
  "name": "agentcraft-sounds",
  "publisher": "rohenaz",
  "version": "2.0.0",
  "description": "Official AgentCraft sound library — SC2, WC3, FF7, FF9, phones, apps, classic OS",
  "types": ["sounds", "ui"]
}
```

```bash
cd ~/code/claude-sounds
git add pack.json
git commit -m "Add pack.json manifest"
git push
```

---

## Task 11: Bump versions and publish

**Step 1: Bump Claude plugin to 0.0.9**

In `.claude-plugin/plugin.json`: `"version": "0.0.9"`

**Step 2: Publish npm CLI as 0.0.2**

In `package.json`: `"version": "0.0.2"`

```bash
cd ~/code/agentcraft
git add -A
git commit -m "v0.0.9: Sound pack system — packs/, CLI pack commands, path migration"
git push
```

Then publish with OTP.

**Step 3: Update plugin**

```bash
CLAUDECODE=1 claude plugin update agentcraft@rohenaz
```

---

## Task 12: Update README

Update `README.md` to document the pack system:

- Replace "Sound Library" section with "Sound Packs"
- Show `agentcraft pack install` as the way to get sounds
- Document `agentcraft pack list/update/remove`
- Note that manual `git clone` into `~/.agentcraft/packs/publisher/name/` works identically
