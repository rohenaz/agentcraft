import { NextResponse } from 'next/server';
import { listPacks, walkPackDir } from '@/lib/packs';

interface UISound {
  path: string;
  filename: string;
  group: string;
}

export async function GET() {
  const packs = await listPacks();
  const results: UISound[] = [];

  for (const pack of packs) {
    const uiDir = `${pack.path}/ui`;
    const files = await walkPackDir(uiDir, pack.path, pack.id).catch(() => []);
    for (const { relPath } of files) {
      const internal = relPath.slice(relPath.indexOf(':') + 1);
      const parts = internal.split('/');
      if (parts[0] !== 'ui') continue;
      const group = parts[1] ?? '';
      results.push({ path: relPath, filename: parts[parts.length - 1], group });
    }
  }

  return NextResponse.json(results);
}
