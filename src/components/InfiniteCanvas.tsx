import { useRef, useState, useCallback, useEffect } from 'react'
import type { TextBlock as TextBlockType, StrokeRecord, EmotionLabel } from '../types'
import { makeBlock } from '../lib/storage'
import type { Theme } from '../lib/theme'
import TextBlockComponent from './TextBlock'
import EmotionIndicator from './EmotionIndicator'
import RadialColorMenu from './RadialColorMenu'

interface Props {
  yearMonth: string
  blocks: TextBlockType[]
  currentFontFamily: string
  currentEmotionHistory: EmotionLabel[]
  textColor: string
  palette: string[]
  analyzeText: (text: string) => Promise<EmotionLabel>
  onCreateBlock: (block: TextBlockType) => void
  onUpdateBlock: (id: string, patch: Partial<TextBlockType>) => void
  onEmotionAnalyzed: (id: string, emotion: EmotionLabel) => void
  onPickColor: (color: string) => void
  notification: string | null
  blockRev?: Record<string, number>
  theme: Theme
}

const CANVAS_W = 3000
const CANVAS_H = 3000
const HOLD_MS = 260
const MIN_SCALE = 0.3
const MAX_SCALE = 3
const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

// Which palette slice is the pointer pointing at? (top/right/bottom/left = 0/1/2/3)
function sliceAt(cx: number, cy: number, x: number, y: number): number | null {
  const dx = x - cx, dy = y - cy
  if (Math.hypot(dx, dy) < 28) return null
  const a = (Math.atan2(dy, dx) * 180) / Math.PI
  const t = (a + 90 + 360) % 360 // 0 = up, clockwise
  return Math.round(t / 90) % 4
}

export default function InfiniteCanvas({
  yearMonth, blocks, currentFontFamily, currentEmotionHistory, textColor, palette,
  analyzeText, onCreateBlock, onUpdateBlock, onEmotionAnalyzed, onPickColor,
  notification, blockRev, theme,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const didPanRef = useRef(false)
  const offsetRef = useRef(offset)
  const scaleRef = useRef(scale)
  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { scaleRef.current = scale }, [scale])

  // ── Zoom ───────────────────────────────────────────────────────
  // Zoom toward a focal screen point (cursor / pinch center), keeping the
  // world point under it fixed: screen = offset + scale * world.
  const zoomAt = useCallback((focalClientX: number, focalClientY: number, nextScale: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const sfx = focalClientX - rect.left, sfy = focalClientY - rect.top
    const s0 = scaleRef.current
    const s1 = clampScale(nextScale)
    if (s1 === s0) return
    const o = offsetRef.current
    const next = { x: sfx - (s1 / s0) * (sfx - o.x), y: sfy - (s1 / s0) * (sfy - o.y) }
    scaleRef.current = s1; offsetRef.current = next
    setScale(s1); setOffset(next)
  }, [])

  // ── Radial quick-color menu (hold + drag) ──────────────────────
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wheelActive = useRef(false)
  const wheelCenter = useRef({ x: 0, y: 0 })
  const wheelSelRef = useRef<number | null>(null)
  const [wheel, setWheel] = useState<{ x: number; y: number } | null>(null)
  const [wheelSel, setWheelSel] = useState<number | null>(null)

  const clearHold = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
  }, [])

  const openWheel = useCallback((x: number, y: number) => {
    wheelActive.current = true
    wheelCenter.current = { x, y }
    wheelSelRef.current = null
    setIsPanning(false)
    setWheel({ x, y })
    setWheelSel(null)
  }, [])

  const closeWheel = useCallback((commit: boolean) => {
    const idx = wheelSelRef.current
    wheelActive.current = false
    setWheel(null); setWheelSel(null); wheelSelRef.current = null
    didPanRef.current = true // suppress the click-to-create that follows
    if (commit && idx != null) onPickColor(palette[idx])
  }, [onPickColor, palette])

  const createBlockAt = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const s = scaleRef.current
    const x = (clientX - rect.left - offsetRef.current.x) / s
    let y = (clientY - rect.top - offsetRef.current.y) / s
    // Snap to ruled lines so text sits on the lines.
    if (theme.lineHeight) y = Math.round(y / theme.lineHeight) * theme.lineHeight
    const newBlock = makeBlock(x, y, currentFontFamily, currentEmotionHistory)
    onCreateBlock(newBlock)
    setActiveId(newBlock.id)
    return newBlock.id
  }, [onCreateBlock, currentFontFamily, currentEmotionHistory, theme.lineHeight])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (didPanRef.current) return
    // Clicking an existing block must edit it, not spawn a new one on top.
    if ((e.target as HTMLElement).closest('[data-block]')) return
    createBlockAt(e.clientX, e.clientY)
  }, [createBlockAt])

  const handleBlockUpdate = useCallback(
    (id: string, text: string, strokes: StrokeRecord[], charStyles: TextBlockType['charStyles']) => {
      onUpdateBlock(id, { text, strokes, charStyles })
    }, [onUpdateBlock])

  // ── Mouse ──────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
    if (e.button !== 0) return
    didPanRef.current = false
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
    const x = e.clientX, y = e.clientY
    clearHold()
    holdTimer.current = setTimeout(() => openWheel(x, y), HOLD_MS)
  }, [offset, clearHold, openWheel])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (wheelActive.current) {
      const idx = sliceAt(wheelCenter.current.x, wheelCenter.current.y, e.clientX, e.clientY)
      wheelSelRef.current = idx; setWheelSel(idx)
      return
    }
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) { didPanRef.current = true; clearHold() }
    setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy })
  }, [isPanning, clearHold])

  const handleMouseUp = useCallback(() => {
    clearHold()
    if (wheelActive.current) { closeWheel(true); return }
    setIsPanning(false)
  }, [clearHold, closeWheel])

  // ── Touch ──────────────────────────────────────────────────────
  const tapStartRef = useRef<{ x: number; y: number } | null>(null)
  // Two-finger gesture baseline: distance + center + transform at gesture start.
  const pinchRef = useRef<{ dist: number; cx: number; cy: number; scale: number; ox: number; oy: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      tapStartRef.current = { x: t.clientX, y: t.clientY }
      didPanRef.current = false
      const x = t.clientX, y = t.clientY
      clearHold()
      holdTimer.current = setTimeout(() => { tapStartRef.current = null; openWheel(x, y) }, HOLD_MS)
    } else if (e.touches.length === 2) {
      clearHold()
      if (wheelActive.current) closeWheel(false)
      tapStartRef.current = null
      const t0 = e.touches[0], t1 = e.touches[1]
      const cx = (t0.clientX + t1.clientX) / 2
      const cy = (t0.clientY + t1.clientY) / 2
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
      didPanRef.current = false
      setIsPanning(true)
      pinchRef.current = {
        dist, cx, cy, scale: scaleRef.current, ox: offsetRef.current.x, oy: offsetRef.current.y,
      }
    }
  }, [clearHold, openWheel, closeWheel])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (wheelActive.current && e.touches.length === 1) {
      e.preventDefault()
      const t = e.touches[0]
      const idx = sliceAt(wheelCenter.current.x, wheelCenter.current.y, t.clientX, t.clientY)
      wheelSelRef.current = idx; setWheelSel(idx)
      return
    }
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const t0 = e.touches[0], t1 = e.touches[1]
      const rect = containerRef.current!.getBoundingClientRect()
      const cx = (t0.clientX + t1.clientX) / 2
      const cy = (t0.clientY + t1.clientY) / 2
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
      const p = pinchRef.current
      const s1 = clampScale(p.scale * (dist / p.dist))
      // World point under the gesture's start center, in the start transform.
      const wx = (p.cx - rect.left - p.ox) / p.scale
      const wy = (p.cy - rect.top - p.oy) / p.scale
      // Re-anchor that world point under the current center (pan + zoom together).
      const next = { x: (cx - rect.left) - s1 * wx, y: (cy - rect.top) - s1 * wy }
      if (Math.abs(cx - p.cx) > 5 || Math.abs(cy - p.cy) > 5 || Math.abs(dist - p.dist) > 5) didPanRef.current = true
      scaleRef.current = s1; offsetRef.current = next
      setScale(s1); setOffset(next)
    } else if (e.touches.length === 1 && tapStartRef.current) {
      const t = e.touches[0]
      if (Math.abs(t.clientX - tapStartRef.current.x) > 10 || Math.abs(t.clientY - tapStartRef.current.y) > 10) {
        tapStartRef.current = null
        clearHold()
      }
    }
  }, [clearHold])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearHold()
    if (e.touches.length < 2) pinchRef.current = null
    if (e.touches.length === 0) setIsPanning(false)
    if (wheelActive.current) { closeWheel(true); return }
    if (tapStartRef.current && e.changedTouches.length === 1) {
      const t = e.changedTouches[0]
      if (!(t.target as HTMLElement).closest('[data-block]')) createBlockAt(t.clientX, t.clientY)
      tapStartRef.current = null
    }
  }, [clearHold, closeWheel, createBlockAt])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveId(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // PC: mouse wheel zoom. Attached natively so we can preventDefault (React's
  // synthetic wheel listener is passive and can't block the page from scrolling).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      clearHold()
      const factor = Math.exp(-e.deltaY * 0.0015)
      zoomAt(e.clientX, e.clientY, scaleRef.current * factor)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, clearHold])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0, overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'crosshair', background: theme.bg, touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Year-month label */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        fontSize: 12, color: 'rgba(0,0,0,0.18)', letterSpacing: 4,
        pointerEvents: 'none', userSelect: 'none', zIndex: 10,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}>
        {yearMonth}
      </div>

      <EmotionIndicator message={notification} />

      {/* World coordinate layer */}
      <div id="td-world" style={{
        position: 'absolute', left: offset.x, top: offset.y, width: CANVAS_W, height: CANVAS_H,
        transform: `scale(${scale})`, transformOrigin: '0 0',
        backgroundImage: theme.world, backgroundSize: theme.worldSize,
      }}>
        {theme.dots && (
          <svg width={CANVAS_W} height={CANVAS_H}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            <defs>
              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.06)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        )}

        {blocks.map(block => (
          <TextBlockComponent
            key={`${block.id}:${blockRev?.[block.id] ?? 0}`}
            block={block}
            isActive={activeId === block.id}
            textColor={textColor}
            lineSnap={theme.lineHeight}
            analyzeText={analyzeText}
            onUpdate={handleBlockUpdate}
            onEmotionAnalyzed={onEmotionAnalyzed}
            onActivate={setActiveId}
          />
        ))}
      </div>

      {wheel && <RadialColorMenu x={wheel.x} y={wheel.y} palette={palette} selected={wheelSel} />}
    </div>
  )
}
