import type { SoundAsset } from './types';

export function formatSoundName(filename: string): string {
  return filename
    .replace(/\.(mp3|wav|ogg|m4a)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function groupSoundsByCategory(sounds: SoundAsset[]): Record<string, Record<string, SoundAsset[]>> {
  const grouped: Record<string, Record<string, SoundAsset[]>> = {};
  for (const sound of sounds) {
    if (!grouped[sound.category]) grouped[sound.category] = {};
    if (!grouped[sound.category][sound.subcategory]) grouped[sound.category][sound.subcategory] = [];
    grouped[sound.category][sound.subcategory].push(sound);
  }
  return grouped;
}

export function getGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    'sc2': 'SC2',
    'wc3': 'Warcraft',
    'aoe': 'AoE',
    'cnc': 'C&C',
    'homeworld': 'Homeworld',
    'classic-os': 'Classic OS',
    'apps': 'Apps',
    'phones': 'Phones',
    'devices': 'Devices',
  };
  return labels[group] ?? group.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getSubTabLabel(category: string): string {
  const labels: Record<string, string> = {
    'sc2/terran': 'Terran',
    'sc2/protoss': 'Protoss',
    'sc2/zerg': 'Zerg',
    'sc2/alerts': 'Alerts',
    'wc3/orc': 'Orc',
    'wc3/human': 'Human',
    'wc3/nightelf': 'Night Elf',
    'wc3/undead': 'Undead',
    'cnc/gdi': 'GDI',
    'cnc/nod': 'NOD',
    'cnc/allied': 'Allied',
    'cnc/soviet': 'Soviet',
    'cnc/eva': 'EVA',
  };
  const segment = category.split('/').pop() ?? category;
  return labels[category] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'sc2/terran': 'SC2 Terran',
    'sc2/protoss': 'SC2 Protoss',
    'sc2/zerg': 'SC2 Zerg',
    'sc2/alerts': 'SC2 Alerts',
    'wc3/orc': 'WC3 Orc',
    'wc3/human': 'WC3 Human',
    'wc3/nightelf': 'WC3 Night Elf',
    'wc3/undead': 'WC3 Undead',
    'classic-os': 'Classic OS',
    'apps': 'Apps',
    'phones': 'Phones',
    'devices': 'Devices',
    'homeworld': 'Homeworld',
    'aoe': 'Age of Empires',
    'cnc': 'C&C',
    'cnc/gdi': 'C&C GDI',
    'cnc/nod': 'C&C NOD',
    'cnc/allied': 'C&C Allied',
    'cnc/soviet': 'C&C Soviet',
    'cnc/eva': 'C&C EVA',
  };
  // Auto-format unknown categories
  return labels[category] ?? (category.split('/').pop() ?? category)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getEventLabel(event: string): string {
  const labels: Record<string, string> = {
    'SessionStart': 'SESSION START',
    'SessionEnd': 'SESSION END',
    'Stop': 'STOP',
    'SubagentStop': 'SUBAGENT STOP',
    'PreToolUse': 'PRE TOOL USE',
    'PostToolUse': 'POST TOOL USE',
    'PostToolUseFailure': 'TOOL FAILURE',
    'Notification': 'NOTIFICATION',
    'PreCompact': 'PRE COMPACT',
  };
  return labels[event] ?? event;
}
