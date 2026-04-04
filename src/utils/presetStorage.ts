import type { StylePreset, StyleProfile } from '@/types';

const STORAGE_KEY = 'humanize_style_presets';

/** Load all saved presets from localStorage */
export function loadPresets(): StylePreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as StylePreset[];
  } catch {
    // Corrupted — ignore
  }
  return [];
}

/** Save a new preset */
export function savePreset(
  name: string,
  profile: StyleProfile,
  sourceFiles: string[],
): StylePreset {
  const preset: StylePreset = {
    id: `preset_${Date.now()}`,
    name,
    profile,
    sourceFiles,
    createdAt: new Date().toISOString(),
  };
  const presets = loadPresets();
  presets.push(preset);
  persistAll(presets);
  return preset;
}

/** Delete a preset by ID */
export function deletePreset(id: string): void {
  const presets = loadPresets().filter((p) => p.id !== id);
  persistAll(presets);
}

/** Rename a preset */
export function renamePreset(id: string, newName: string): void {
  const presets = loadPresets();
  const target = presets.find((p) => p.id === id);
  if (target) {
    target.name = newName;
    persistAll(presets);
  }
}

function persistAll(presets: StylePreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Storage full — silently fail
  }
}
