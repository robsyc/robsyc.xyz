import { mode } from 'mode-watcher';
import type { ColorMode } from '@xyflow/svelte';
import { derived } from 'svelte/store';

/**
 * A derived store that converts mode-watcher's mode to SvelteFlow's ColorMode
 * This makes it easy to keep SvelteFlow's theme in sync with Tailwind's theme
 */
export const flowColorMode = derived<typeof mode, ColorMode>(
  mode,
  ($mode) => {
    if ($mode === 'dark') return 'dark';
    if ($mode === 'light') return 'light';
    return 'system';
  }
);

/**
 * A utility function to get the current theme as a string
 * Useful for components that need the theme as a simple string value
 */
export function getThemeValue(themeMode: 'light' | 'dark' | undefined): string {
  return themeMode || 'system';
} 