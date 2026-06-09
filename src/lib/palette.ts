// Quick-menu color palette: 4 user-registered glyph colors, persisted locally.
export const DEFAULT_INK = '#1a1a1a'
const KEY = 'typing_dot_palette'
const EVENT = 'typingdot:palettechange'
const DEFAULT: string[] = ['#1a1a1a', '#fc2b32', '#2563eb', '#16a34a']

export function getPalette(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length === 4) return arr
    }
  } catch { /* ignore */ }
  return [...DEFAULT]
}

export function setPalette(colors: string[]): void {
  localStorage.setItem(KEY, JSON.stringify(colors.slice(0, 4)))
  window.dispatchEvent(new CustomEvent(EVENT))
}

export const PALETTE_EVENT = EVENT
