'use client';

import { useState } from 'react';
import type { AgentFormData, AgentInfo } from '@/lib/types';

const MODELS = ['sonnet', 'opus', 'haiku'];
const COLORS = ['blue', 'green', 'red', 'purple', 'orange', 'yellow', 'pink'];
const COMMON_TOOLS = ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'TodoWrite'];

interface AgentFormProps {
  initial?: AgentInfo;
  onSave: (data: AgentFormData, originalName?: string) => Promise<void>;
  onCancel: () => void;
}

export function AgentForm({ initial, onSave, onCancel }: AgentFormProps) {
  const [form, setForm] = useState<AgentFormData>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    model: initial?.model ?? 'sonnet',
    tools: initial?.tools ?? 'Read, Write, Edit, Bash, Grep',
    color: initial?.color ?? 'blue',
    prompt: initial?.prompt ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof AgentFormData, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const toggleTool = (tool: string) => {
    const current = form.tools.split(',').map((t) => t.trim()).filter(Boolean);
    const next = current.includes(tool)
      ? current.filter((t) => t !== tool)
      : [...current, tool];
    set('tools', next.join(', '));
  };

  const hasTools = (tool: string) => form.tools.split(',').map((t) => t.trim()).includes(tool);

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      await onSave(form, initial?.name);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'rgba(0,0,0,0.4)',
    border: '1px solid var(--sf-border)',
    color: 'rgba(255,255,255,0.85)',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '11px',
    padding: '4px 8px',
    width: '100%',
  } as const;

  const labelStyle = {
    fontSize: '9px',
    color: 'var(--sf-cyan)',
    opacity: 0.6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '3px',
    display: 'block',
  };

  return (
    <div
      className="mt-1 mb-2 p-3 space-y-3"
      style={{ border: '1px solid rgba(0,229,255,0.3)', backgroundColor: 'rgba(0,229,255,0.03)' }}
    >
      <div className="sf-heading text-[10px] tracking-widest uppercase opacity-60" style={{ color: 'var(--sf-cyan)' }}>
        {initial ? 'EDIT UNIT' : 'DEPLOY NEW UNIT'}
      </div>

      {/* Name */}
      <div>
        <label style={labelStyle}>CALLSIGN (name)</label>
        <input
          style={inputStyle}
          value={form.name}
          onChange={(e) => set('name', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          placeholder="my-specialist"
          disabled={!!initial}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>BRIEFING (description)</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: '48px' }}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Expert in..."
          rows={2}
        />
      </div>

      {/* Model + Color row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label style={labelStyle}>MODEL</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
          >
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label style={labelStyle}>COLOR</label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
          >
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Tools */}
      <div>
        <label style={labelStyle}>ARMAMENTS (tools)</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {COMMON_TOOLS.map((tool) => (
            <button
              key={tool}
              onClick={() => toggleTool(tool)}
              className="text-[9px] px-1.5 py-0.5 transition-all"
              style={{
                border: `1px solid ${hasTools(tool) ? 'var(--sf-cyan)' : 'var(--sf-border)'}`,
                color: hasTools(tool) ? 'var(--sf-cyan)' : 'rgba(255,255,255,0.3)',
                backgroundColor: hasTools(tool) ? 'rgba(0,229,255,0.08)' : 'transparent',
              }}
            >
              {tool}
            </button>
          ))}
        </div>
        <input
          style={inputStyle}
          value={form.tools}
          onChange={(e) => set('tools', e.target.value)}
          placeholder="Read, Write, Edit, Bash"
        />
      </div>

      {/* System prompt */}
      <div>
        <label style={labelStyle}>ORDERS (system prompt)</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="You are a specialist in..."
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.description.trim()}
          className="flex-1 py-1.5 text-[10px] sf-heading font-bold uppercase tracking-wider transition-all"
          style={{
            border: '1px solid var(--sf-cyan)',
            color: saving ? 'rgba(0,229,255,0.4)' : 'var(--sf-cyan)',
            backgroundColor: 'rgba(0,229,255,0.08)',
          }}
        >
          {saving ? 'DEPLOYING...' : (initial ? 'UPDATE UNIT' : 'DEPLOY UNIT')}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-[10px] sf-heading uppercase tracking-wider transition-all"
          style={{ border: '1px solid var(--sf-border)', color: 'rgba(255,255,255,0.4)' }}
        >
          ABORT
        </button>
      </div>
    </div>
  );
}
