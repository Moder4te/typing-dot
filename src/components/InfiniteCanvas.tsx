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
  yearMonth,
  blocks,
  currentFontFamily,
  currentEmotionHistory,
  analyzeText,
  onBlocksChange,
  onEmotionAnalyzed,
  notification,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const didPanRef = useRef(false)

  const updateBlocks = useCallback(
    (next: TextBlockType[]) => onBlocksChange(next),
    [onBlocksChange]
  )

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (didPanRef.current) return
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return

      const rect = containerRef.current!.getBoundingClientRect()
      const x = e.clientX - rect.left - offset.x
      const y = e.clientY - rect.top - offset.y

      const newBlock = makeBlock(x, y, currentFontFamily, currentEmotionHistory)
      updateBlocks([...blocks, newBlock])
      setActiveId(newBlock.id)
    },
    [blocks, offset, updateBlocks, currentFontFamily, currentEmotionHistory]
  )

  const handleBlockUpdate = useCallback(
    (id: string, text: string, strokes: StrokeRecord[]) => {
      updateBlocks(
        blocks.map(b => b.id === id ? { ...b, text, strokes } : b)
      )
    },
    [blocks, updateBlocks]
  )

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

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveId(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: isPanning ? 'grabbing' : 'crosshair',
        background: '#faf9f6',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* 연월 라벨 */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        fontSize: 12, color: 'rgba(0,0,0,0.18)', letterSpacing: 4,
        pointerEvents: 'none', userSelect: 'none', zIndex: 10,
      }}>
        {yearMonth}
      </div>

      {/* 에러/상태 인디케이터 */}
      <EmotionIndicator message={notification} />

      {/* 월드 좌표계 */}
      <div style={{
        position: 'absolute', left: offset.x, top: offset.y,
        width: CANVAS_W, height: CANVAS_H,
      }}>
        {/* 점 격자 */}
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
      }}>
        빈 곳을 클릭해 쓰기 시작 · 드래그로 이동
      </div>
    </div>
  )
}
