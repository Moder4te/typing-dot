import type { CanvasEntry, TextBlock } from '../types'

const PREFIX = 'typing_dot_'
const SETTINGS_KEY = 'typing_dot_settings'
const DEFAULT_FONT = 'TD_neutral_1'

export function loadEntry(yearMonth: string): CanvasEntry | null {
  try {
    const raw = localStorage.getItem(PREFIX + yearMonth)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveEntry(entry: CanvasEntry): void {
  localStorage.setItem(PREFIX + entry.yearMonth, JSON.stringify(entry))
}

export function listMonths(): string[] {
  const months: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX) && key !== SETTINGS_KEY) {
      months.push(key.replace(PREFIX, ''))
    }
  }
  return months.sort().reverse()
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function makeEntry(
  yearMonth: string,
  blocks: TextBlock[] = []
): CanvasEntry {
  return {
    id: crypto.randomUUID(),
    userId: null,
    yearMonth,
    blocks,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function makeBlock(
  x: number,
  y: number,
  fontFamily: string = DEFAULT_FONT,
  emotionHistory: import('../types').EmotionLabel[] = []
): TextBlock {
  return {
    id: crypto.randomUUID(),
    x,
    y,
    text: '',
    createdAt: Date.now(),
    strokes: [],
    charStyles: [],
    emotion: 'unclassified',
    emotionHistory,
    fontFamily,
    fontSize: 1.0,
    fontWeight: 400,
    isItalic: false,
  }
}

