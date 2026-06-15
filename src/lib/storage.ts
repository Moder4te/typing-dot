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

// Entries are now keyed by date (YYYY-MM-DD) — one canvas per day, grouped by
// month in the UI. Legacy month keys (YYYY-MM) are ignored here (kept but hidden).
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export function listMonths(): string[] {
  const dates: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX) && key !== SETTINGS_KEY) {
      const k = key.replace(PREFIX, '')
      if (DATE_KEY.test(k)) dates.push(k)
    }
  }
  return dates.sort().reverse()
}

// Remove legacy month-keyed entries (YYYY-MM) from localStorage so they can't
// collide with the date model. Date entries (YYYY-MM-DD) and settings are kept.
const MONTH_KEY = /^\d{4}-\d{2}$/
export function purgeLegacyLocal(): number {
  const remove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX) && key !== SETTINGS_KEY) {
      if (MONTH_KEY.test(key.replace(PREFIX, ''))) remove.push(key)
    }
  }
  remove.forEach(k => localStorage.removeItem(k))
  return remove.length
}

// Returns today's date key (YYYY-MM-DD). Name kept for call-site compatibility;
// the partition key is now a date rather than a month.
export function currentYearMonth(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

// Group date keys (YYYY-MM-DD) by their month (YYYY-MM).
export function groupByMonth(dateKeys: string[]): Record<string, string[]> {
  return dateKeys.reduce<Record<string, string[]>>((acc, dk) => {
    const monthKey = dk.slice(0, 7)
    ;(acc[monthKey] ??= []).push(dk)
    return acc
  }, {})
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return new Date(Number(year), Number(month) - 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function formatDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-')
  return `${month}/${day}`
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

