import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { AgentInfo } from '@/lib/types';

const AGENTS_DIR = join(homedir(), '.claude', 'agents');

function buildAgentContent(data: { name: string; description: string; model: string; tools: string; color: string; prompt: string }): string {
  const lines = ['---', `name: ${data.name}`, `description: ${data.description}`, `model: ${data.model}`];
  if (data.tools) lines.push(`tools: ${data.tools}`);
  if (data.color) lines.push(`color: ${data.color}`);
  lines.push('---', '', data.prompt || '');
  return lines.join('\n');
}

export async function GET() {
  try {
    const files = await readdir(AGENTS_DIR);
    const agents: AgentInfo[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await readFile(join(AGENTS_DIR, file), 'utf-8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      const modelMatch = content.match(/^model:\s*(.+)$/m);
      const toolsMatch = content.match(/^tools:\s*(.+)$/m);
      const colorMatch = content.match(/^color:\s*(.+)$/m);
      const promptMatch = content.match(/^---\s*\n(?:.*\n)*?---\s*\n([\s\S]*)$/);
      const name = nameMatch ? nameMatch[1].trim() : file.replace('.md', '');
      agents.push({
        name,
        filename: file,
        description: descMatch ? descMatch[1].trim() : '',
        model: modelMatch ? modelMatch[1].trim() : 'sonnet',
        tools: toolsMatch ? toolsMatch[1].trim() : '',
        color: colorMatch ? colorMatch[1].trim() : '',
        prompt: promptMatch ? promptMatch[1].trim() : '',
      });
    }

    return NextResponse.json(agents);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.name || typeof data.name !== 'string') {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const filename = `${data.name.toLowerCase().replace(/\s+/g, '-')}.md`;
    const content = buildAgentContent(data);
    await writeFile(join(AGENTS_DIR, filename), content, 'utf-8');
    return NextResponse.json({ ok: true, filename });
  } catch {
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
