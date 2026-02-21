import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { SkillInfo } from '@/lib/types';

const HOME = homedir();
const USER_SKILLS_DIR = join(HOME, '.claude', 'skills');
const PLUGINS_JSON = join(HOME, '.claude', 'plugins', 'installed_plugins.json');

async function readSkillFromDir(dir: string, namespace?: string): Promise<SkillInfo | null> {
  try {
    const skillMd = await readFile(join(dir, 'SKILL.md'), 'utf-8');
    const descMatch = skillMd.match(/^description:\s*(.+)$/m);
    const dirName = dir.split('/').pop() ?? '';
    const qualifiedName = namespace ? `${namespace}:${dirName}` : dirName;
    return {
      name: dirName,
      qualifiedName,
      description: descMatch ? descMatch[1].trim() : dirName,
      namespace,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const skills: SkillInfo[] = [];
  const seen = new Set<string>();

  // User skills from ~/.claude/skills/
  try {
    const entries = await readdir(USER_SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skill = await readSkillFromDir(join(USER_SKILLS_DIR, entry.name));
      if (skill && !seen.has(skill.qualifiedName)) {
        skills.push(skill);
        seen.add(skill.qualifiedName);
      }
    }
  } catch {
    // user skills dir may not exist
  }

  // Plugin skills from installed_plugins.json
  try {
    const raw = await readFile(PLUGINS_JSON, 'utf-8');
    const data = JSON.parse(raw) as {
      version: number;
      plugins: Record<string, Array<{ scope: string; installPath: string }>>;
    };

    for (const [pluginKey, installs] of Object.entries(data.plugins)) {
      const pluginName = pluginKey.split('@')[0];
      // Deduplicate: use first install (user-scope preferred over project)
      const install = installs.find(i => i.scope === 'user') ?? installs[0];
      if (!install?.installPath) continue;

      const skillsDir = join(install.installPath, 'skills');
      try {
        const entries = await readdir(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const qualifiedName = `${pluginName}:${entry.name}`;
          if (seen.has(qualifiedName)) continue;
          const skill = await readSkillFromDir(join(skillsDir, entry.name), pluginName);
          if (skill) {
            skills.push(skill);
            seen.add(qualifiedName);
          }
        }
      } catch {
        // plugin may not have a skills dir
      }
    }
  } catch {
    // installed_plugins.json may not exist
  }

  return NextResponse.json(skills.sort((a, b) => a.qualifiedName.localeCompare(b.qualifiedName)));
}
