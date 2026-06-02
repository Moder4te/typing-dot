import { useRef, useState, useCallback, useEffect } from 'react'
import type { TextBlock as TextBlockType, StrokeRecord, EmotionLabel } from '../types'
import { makeBlock } from '../lib/storage'
import TextBlockComponent from './TextBlock'
import EmotionIndicator from './EmotionIndicator'

interface Props {
  yearMonth: string
  blocks: TextBlockType[]
  currentFontFamily: string
  currentEmotionHistory: EmotionLabel[]
  analyzeText: (text: string) => Promise<EmotionLabel>
  onBlocksChange: (blocks: TextBlockType[]) => void
  onEmotionAnalyzed: (id: string, emotion: EmotionLabel) => void
  notification: string | null
}

const CANVAS_W = 3000
const CANVAS_H = 3000

export default function InfiniteCanvas({
  yearMonth, blocks, currentFontFamily, currentEmotionHistory,
  analyzeText, onBlocksChange, onEmotionAnalyzed, notification,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const didPanRef = useRef(false)
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  const updateBlocks = useCallback(
    (next: TextBlockType[]) => onBlocksChange(next),
    [onBlocksChange]
  )

  const createBlockAt = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const x = clientX - rect.left - offsetRef.current.x
    const y = clientY - rect.top - offsetRef.current.y
    const newBlock = makeBlock(x, y, currentFontFamily, currentEmotionHistory)
    updateBlocks([...blocks, newBlock])
    setActiveId(newBlock.id)
    return newBlock.id
  }, [blocks, updateBlocks, currentFontFamily, currentEmotionHistory])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (didPanRef.current) return
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      createBlockAt(e.clientX, e.clientY)
    },
    [createBlockAt]
  )

  const handleBlockUpdate = useCallback(
    (id: string, text: string, strokes: StrokeRecord[]) => {
      updateBlocks(blocks.map(b => b.id === id ? { ...b, text, strokes } : b))
    },
    [blocks, updateBlocks]
  )

  // ── Mouse panning ──────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
    if (e.button !== 0) return
    didPanRef.current = false
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }, [offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPanRef.current = true
    setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy })
  }, [isPanning])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  // ── Touch: 한 손가락 탭 = 타이핑, 두 손가락 드래그 = 이동 ──────
  const tapStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // 한 손가락 — 탭 감지용으로만 사용
      const t = e.touches[0]
      tapStartRef.current = { x: t.clientX, y: t.clientY }
      didPanRef.current = false
    } else if (e.touches.length === 2) {
      // 두 손가락 — 이동 시작
      tapStartRef.current = null
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      didPanRef.current = false
      setIsPanning(true)
      panStart.current = { x: cx, y: cy, ox: offsetRef.current.x, oy: offsetRef.current.y }
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPanning) {
      e.preventDefault()
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dx = cx - panStart.current.x
      const dy = cy - panStart.current.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didPanRef.current = true
      setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy })
    } else if (e.touches.length === 1 && tapStartRef.current) {
      // 한 손가락이 많이 움직이면 탭 취소
      const t = e.touches[0]
      const dx = t.clientX - tapStartRef.current.x
      const dy = t.clientY - tapStartRef.current.y
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        tapStartRef.current = null
      }
    }
  }, [isPanning])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) setIsPanning(false)

    // 한 손가락 탭 → 블록 생성
    if (tapStartRef.current && e.changedTouches.length === 1) {
      const t = e.changedTouches[0]
      if (!(t.target as HTMLElement).closest('textarea')) {
        createBlockAt(t.clientX, t.clientY)
      }
      tapStartRef.current = null
    }
  }, [createBlockAt])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveId(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'crosshair',
        background: '#fafafa',
        touchAction: 'none',
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
      <div style={{
        position: 'absolute', left: offset.x, top: offset.y,
        width: CANVAS_W, height: CANVAS_H,
      }}>
        {/* Dot grid */}
        <svg width={CANVAS_W} height={CANVAS_H}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <defs>
            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.06)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {blocks.map(block => (
          <TextBlockComponent
            key={block.id}
            block={block}
            isActive={activeId === block.id}
            analyzeText={analyzeText}
            onUpdate={handleBlockUpdate}
            onEmotionAnalyzed={onEmotionAnalyzed}
            onActivate={setActiveId}
          />
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, color: 'rgba(0,0,0,0.2)', pointerEvents: 'none', userSelect: 'none',
        letterSpacing: 1,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}>
        탭으로 쓰기 시작 · 두 손가락 드래그로 이동
      </div>
    </div>
  )
}
