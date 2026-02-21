import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const AGENTS_DIR = join(homedir(), '.claude', 'agents');

function buildAgentContent(data: { name: string; description: string; model: string; tools: string; color: string; prompt: string }): string {
  const lines = ['---', `name: ${data.name}`, `description: ${data.description}`, `model: ${data.model}`];
  if (data.tools) lines.push(`tools: ${data.tools}`);
  if (data.color) lines.push(`color: ${data.color}`);
  lines.push('---', '', data.prompt || '');
  return lines.join('\n');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const data = await req.json();
    const filename = `${name}.md`;
    const content = buildAgentContent(data);
    await writeFile(join(AGENTS_DIR, filename), content, 'utf-8');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const filename = `${name}.md`;
    await unlink(join(AGENTS_DIR, filename));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
