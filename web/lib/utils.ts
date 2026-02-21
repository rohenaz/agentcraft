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

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'sc2/terran': 'SC2 Terran',
    'sc2/protoss': 'SC2 Protoss',
    'sc2/zerg': 'SC2 Zerg',
    'sc2/alerts': 'SC2 Alerts',
    'classic-os': 'Classic OS',
    'classic-os/mac': 'Mac OS',
    'classic-os/windows': 'Windows',
    'classic-os/linux': 'Linux',
    'aim': 'AIM',
    'icq': 'ICQ',
    'winamp': 'Winamp',
    'phones/nokia': 'Nokia',
    'phones/motorola': 'Motorola',
    'phones/samsung': 'Samsung',
    'phones/sony-ericsson': 'Sony Ericsson',
    'messengers/msn': 'MSN',
    'messengers/yahoo': 'Yahoo',
    'messengers/skype': 'Skype',
    'devices/modem': 'Modem',
    'devices/camera': 'Camera',
    'devices/pager': 'Pager',
  };
  // Auto-format unknown categories: "phones/nokia" → "Nokia"
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
