import { supabase } from './supabase'
import type { TextBlock, CharStyle, EmotionLabel, StrokeRecord } from '../types'

export interface DiaryMeta {
  id: string
  name: string
  kind: 'personal' | 'shared'
  owner_id: string
}

// ── row ↔ TextBlock mapping ─────────────────────────────────
export interface BlockRow {
  id: string
  diary_id: string
  author_id: string
  year_month: string
  x: number
  y: number
  text: string
  strokes: StrokeRecord[]
  char_styles: CharStyle[]
  emotion: string
  font_family: string
  font_size: number
  font_weight: number
  is_italic: boolean
  created_at: string
}

export function rowToBlock(r: BlockRow): TextBlock {
  return {
    id: r.id,
    x: r.x,
    y: r.y,
    text: r.text,
    createdAt: new Date(r.created_at).getTime(),
    strokes: r.strokes ?? [],
    charStyles: r.char_styles ?? [],
    emotion: r.emotion as EmotionLabel,
    emotionHistory: [],
    fontFamily: r.font_family,
    fontSize: r.font_size,
    fontWeight: r.font_weight,
    isItalic: r.is_italic,
  }
}

function blockToRow(b: TextBlock, diaryId: string, authorId: string, yearMonth: string) {
  return {
    id: b.id,
    diary_id: diaryId,
    author_id: authorId,
    year_month: yearMonth,
    x: b.x,
    y: b.y,
    text: b.text,
    strokes: b.strokes,
    char_styles: b.charStyles,
    emotion: b.emotion,
    font_family: b.fontFamily,
    font_size: b.fontSize,
    font_weight: b.fontWeight,
    is_italic: b.isItalic,
    updated_at: new Date().toISOString(),
  }
}

// ── diaries ─────────────────────────────────────────────────
export async function listDiaries(): Promise<DiaryMeta[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('diaries')
    .select('id, name, kind, owner_id')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as DiaryMeta[]
}

// Create a personal diary. id is generated client-side and `.select()` is avoided
// for the same reason as createSharedDiary (the diaries SELECT policy can't see the
// row in its own INSERT snapshot). owner_id defaults to auth.uid() (migration 0004).
export async function createDiary(name: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const id = crypto.randomUUID()
  const { error } = await supabase.from('diaries').insert({ id, name, kind: 'personal' })
  if (error) throw error
  return id
}

export async function renameDiary(id: string, name: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('diaries').update({ name }).eq('id', id)
  if (error) throw error
}

// Deletes the diary and (via FK on delete cascade) all its blocks. RLS restricts
// this to the owner.
export async function deleteDiary(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('diaries').delete().eq('id', id)
  if (error) throw error
}

// Entries are keyed by date (YYYY-MM-DD). Legacy month keys (YYYY-MM) are ignored.
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const MONTH_KEY = /^\d{4}-\d{2}$/

// ── date entries with content (plus a requested current date) ────
export async function listMonths(diaryId: string, ensure: string): Promise<string[]> {
  if (!supabase) return [ensure]
  const { data, error } = await supabase
    .from('blocks')
    .select('year_month')
    .eq('diary_id', diaryId)
  if (error) throw error
  const set = new Set<string>([ensure])
  for (const r of data ?? []) {
    const ym = (r as { year_month: string }).year_month
    if (DATE_KEY.test(ym)) set.add(ym)   // skip legacy month-keyed rows
  }
  return [...set].sort().reverse()
}

// Permanently delete legacy month-keyed blocks (year_month = YYYY-MM) across the
// given diaries, so they can't collide with the date model. Returns rows deleted.
export async function purgeLegacyBlocks(diaryIds: string[]): Promise<number> {
  if (!supabase || diaryIds.length === 0) return 0
  let total = 0
  for (const id of diaryIds) {
    const { data, error } = await supabase.from('blocks').select('year_month').eq('diary_id', id)
    if (error) throw error
    const legacy = [...new Set(
      (data ?? [])
        .map(r => (r as { year_month: string }).year_month)
        .filter(ym => MONTH_KEY.test(ym))
    )]
    if (legacy.length === 0) continue
    const { error: delErr } = await supabase.from('blocks').delete().eq('diary_id', id).in('year_month', legacy)
    if (delErr) throw delErr
    total += legacy.length
  }
  return total
}

// ── blocks ──────────────────────────────────────────────────
export async function loadBlocks(diaryId: string, yearMonth: string): Promise<TextBlock[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('diary_id', diaryId)
    .eq('year_month', yearMonth)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as BlockRow[]).map(rowToBlock)
}

export async function upsertBlock(
  block: TextBlock, diaryId: string, authorId: string, yearMonth: string,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('blocks').upsert(blockToRow(block, diaryId, authorId, yearMonth))
  if (error) throw error
}

// ── one-time localStorage → cloud migration ─────────────────
const PREFIX = 'typing_dot_'
const SETTINGS_KEY = 'typing_dot_settings'
const MIGRATED_FLAG = 'typing_dot_migrated_v1'

export function hasLocalEntries(): boolean {
  if (localStorage.getItem(MIGRATED_FLAG)) return false
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX) && k !== SETTINGS_KEY && k !== MIGRATED_FLAG) {
      try {
        const e = JSON.parse(localStorage.getItem(k) ?? '{}')
        if (Array.isArray(e.blocks) && e.blocks.some((b: TextBlock) => b.text?.trim())) return true
      } catch { /* ignore */ }
    }
  }
  return false
}

export async function migrateLocalEntries(diaryId: string, authorId: string): Promise<number> {
  if (!supabase) return 0
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(PREFIX) || k === SETTINGS_KEY || k === MIGRATED_FLAG) continue
    let entry: { yearMonth?: string; blocks?: TextBlock[] }
    try { entry = JSON.parse(localStorage.getItem(k) ?? '{}') } catch { continue }
    const ym = entry.yearMonth ?? k.replace(PREFIX, '')
    for (const b of entry.blocks ?? []) {
      if (!b.text?.trim()) continue
      await upsertBlock(
        { ...b, charStyles: b.charStyles ?? [] },
        diaryId, authorId, ym,
      )
      count++
    }
  }
  localStorage.setItem(MIGRATED_FLAG, new Date().toISOString())
  return count
}

export function markMigrated(): void {
  localStorage.setItem(MIGRATED_FLAG, new Date().toISOString())
}
