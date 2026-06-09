import { useCallback, useEffect, useRef, useState } from 'react'
import type { TextBlock } from '../types'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import {
  loadEntry, saveEntry, listMonths as listLocalMonths,
  currentYearMonth, makeEntry,
} from '../lib/storage'
import {
  listDiaries, listMonths as listCloudMonths, loadBlocks, upsertBlock,
  hasLocalEntries, migrateLocalEntries, markMigrated, rowToBlock,
  type DiaryMeta, type BlockRow,
} from '../lib/cloudStore'
import { logger } from '../lib/logger'

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1) // m is 1-indexed input → JS 0-indexed gives next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function initialLocalMonths(): string[] {
  const ym = currentYearMonth()
  const stored = listLocalMonths()
  return stored.includes(ym) ? stored : [ym, ...stored]
}

export interface CanvasData {
  cloud: boolean
  loading: boolean
  diaries: DiaryMeta[]
  activeDiaryId: string | null
  selectDiary: (id: string) => void
  months: string[]
  activeMonth: string
  selectMonth: (ym: string) => void
  newMonth: () => void
  blocks: TextBlock[]
  revs: Record<string, number>   // remote-edit revisions, for remounting others' blocks
  createBlock: (b: TextBlock) => void
  updateBlock: (id: string, patch: Partial<TextBlock>) => void
  pendingMigration: boolean
  runMigration: () => Promise<number>
  dismissMigration: () => void
}

export function useCanvasData(): CanvasData {
  const { configured, session, user } = useAuth()
  const cloud = configured && !!session && !!user

  const [loading, setLoading] = useState(cloud)
  const [diaries, setDiaries] = useState<DiaryMeta[]>([])
  const [activeDiaryId, setActiveDiaryId] = useState<string | null>(null)
  const [months, setMonths] = useState<string[]>(initialLocalMonths)
  const [activeMonth, setActiveMonth] = useState<string>(currentYearMonth())
  const [blocks, setBlocks] = useState<TextBlock[]>(
    () => (loadEntry(currentYearMonth())?.blocks ?? [])
  )
  const [pendingMigration, setPendingMigration] = useState(false)
  const [revs, setRevs] = useState<Record<string, number>>({})

  // Ref mirror of blocks for reads inside debounced timers / handlers.
  const blocksRef = useRef<TextBlock[]>(blocks)
  const applyBlocks = useCallback((next: TextBlock[]) => {
    blocksRef.current = next
    setBlocks(next)
  }, [])

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const ctx = useRef({ diaryId: null as string | null, month: currentYearMonth(), authorId: '' })

  // ── cloud upsert (debounced per block id) ─────────────────
  const flush = useCallback((id: string) => {
    const b = blocksRef.current.find(x => x.id === id)
    const { diaryId, authorId, month } = ctx.current
    if (!b || !diaryId || !b.text.trim()) return // never persist empty blocks
    upsertBlock(b, diaryId, authorId, month).catch(e => logger.error('[cloud] upsert 실패', e))
  }, [])

  const scheduleSave = useCallback((id: string, immediate = false) => {
    if (!cloud) return
    const timers = saveTimers.current
    const existing = timers.get(id)
    if (existing) clearTimeout(existing)
    if (immediate) { flush(id); return }
    timers.set(id, setTimeout(() => { flush(id); timers.delete(id) }, 700))
  }, [cloud, flush])

  const saveLocal = useCallback((ym: string, next: TextBlock[]) => {
    const entry = loadEntry(ym) ?? makeEntry(ym)
    saveEntry({ ...entry, blocks: next, updatedAt: Date.now() })
  }, [])

  // ── cloud initial load (async → lint-safe) ────────────────
  useEffect(() => {
    if (!cloud) { ctx.current = { diaryId: null, month: currentYearMonth(), authorId: '' }; return }
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const ds = await listDiaries()
        if (!alive) return
        const personal = ds.find(d => d.kind === 'personal') ?? ds[0] ?? null
        const ym = currentYearMonth()
        setDiaries(ds)
        setActiveDiaryId(personal?.id ?? null)
        ctx.current = { diaryId: personal?.id ?? null, month: ym, authorId: user!.id }
        if (personal) {
          const [ms, bs] = await Promise.all([listCloudMonths(personal.id, ym), loadBlocks(personal.id, ym)])
          if (!alive) return
          setMonths(ms); setActiveMonth(ym); applyBlocks(bs)
          if (hasLocalEntries()) setPendingMigration(true)
        }
      } catch (e) {
        logger.error('[cloud] 초기 로드 실패', e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [cloud, user, applyBlocks])

  // ── realtime: live sync of other members' blocks in the active diary ──
  useEffect(() => {
    if (!cloud || !activeDiaryId || !supabase) return
    const sb = supabase
    const myUid = user!.id
    const channel = sb
      .channel(`blocks-${activeDiaryId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocks', filter: `diary_id=eq.${activeDiaryId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id
            if (id) applyBlocks(blocksRef.current.filter(b => b.id !== id))
            return
          }
          const row = payload.new as BlockRow
          if (row.author_id === myUid) return                 // ignore my own write echoes
          if (row.year_month !== ctx.current.month) return     // different month than current view
          const nb = rowToBlock(row)
          const exists = blocksRef.current.some(b => b.id === nb.id)
          applyBlocks(exists
            ? blocksRef.current.map(b => b.id === nb.id ? nb : b)
            : [...blocksRef.current, nb])
          setRevs(prev => ({ ...prev, [nb.id]: (prev[nb.id] ?? 0) + 1 }))
        },
      )
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [cloud, activeDiaryId, user, applyBlocks])

  // ── ops ───────────────────────────────────────────────────
  const createBlock = useCallback((b: TextBlock) => {
    const next = [...blocksRef.current, b]
    applyBlocks(next)
    // Cloud: don't insert an empty block on create — the first autosave after
    // typing persists it (see flush()). Local keeps prior behavior.
    if (!cloud) saveLocal(ctx.current.month, next)
  }, [cloud, saveLocal, applyBlocks])

  const updateBlock = useCallback((id: string, patch: Partial<TextBlock>) => {
    const next = blocksRef.current.map(b => b.id === id ? { ...b, ...patch } : b)
    applyBlocks(next)
    if (cloud) scheduleSave(id)
    else saveLocal(ctx.current.month, next)
  }, [cloud, scheduleSave, saveLocal, applyBlocks])

  const loadMonth = useCallback(async (diaryId: string | null, ym: string) => {
    ctx.current.month = ym
    setActiveMonth(ym)
    if (cloud && diaryId) applyBlocks(await loadBlocks(diaryId, ym))
    else applyBlocks(loadEntry(ym)?.blocks ?? [])
  }, [cloud, applyBlocks])

  const selectMonth = useCallback((ym: string) => {
    loadMonth(ctx.current.diaryId, ym)
  }, [loadMonth])

  const newMonth = useCallback(() => {
    const ym = nextMonth(months[0] ?? currentYearMonth())
    if (months.includes(ym)) return
    setMonths(prev => [ym, ...prev].sort().reverse())
    ctx.current.month = ym
    setActiveMonth(ym)
    applyBlocks([])
    if (!cloud) saveEntry(makeEntry(ym))
  }, [months, cloud, applyBlocks])

  const selectDiary = useCallback((id: string) => {
    if (!cloud) return
    setActiveDiaryId(id)
    ctx.current.diaryId = id
    const ym = currentYearMonth()
    ;(async () => {
      const [ms, bs] = await Promise.all([listCloudMonths(id, ym), loadBlocks(id, ym)])
      setMonths(ms); ctx.current.month = ym; setActiveMonth(ym); applyBlocks(bs)
    })()
  }, [cloud, applyBlocks])

  const runMigration = useCallback(async () => {
    const id = ctx.current.diaryId
    if (!cloud || !id) return 0
    const n = await migrateLocalEntries(id, user!.id)
    const [ms, bs] = await Promise.all([listCloudMonths(id, ctx.current.month), loadBlocks(id, ctx.current.month)])
    setMonths(ms); applyBlocks(bs); setPendingMigration(false)
    return n
  }, [cloud, user, applyBlocks])

  const dismissMigration = useCallback(() => { markMigrated(); setPendingMigration(false) }, [])

  return {
    cloud, loading, diaries, activeDiaryId, selectDiary,
    months, activeMonth, selectMonth, newMonth,
    blocks, revs, createBlock, updateBlock,
    pendingMigration, runMigration, dismissMigration,
  }
}
