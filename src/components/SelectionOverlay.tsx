import { useEffect, useRef, useState } from 'react'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

export interface ClientRect { left: number; top: number; w: number; h: number }

// Full-viewport overlay: user drags a rectangle to choose the capture region.
// Reports the rect in client coordinates; cancels on Esc or a too-small drag.
export default function SelectionOverlay({
  onSelect, onCancel,
}: {
  onSelect: (r: ClientRect) => void
  onCancel: () => void
}) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<ClientRect | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const toRect = (x: number, y: number): ClientRect => {
    const s = startRef.current!
    return { left: Math.min(s.x, x), top: Math.min(s.y, y), w: Math.abs(x - s.x), h: Math.abs(y - s.y) }
  }

  const down = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, y: e.clientY }
    setRect({ left: e.clientX, top: e.clientY, w: 0, h: 0 })
  }
  const move = (e: React.PointerEvent) => {
    if (!startRef.current) return
    setRect(toRect(e.clientX, e.clientY))
  }
  const up = (e: React.PointerEvent) => {
    if (!startRef.current) return
    const r = toRect(e.clientX, e.clientY)
    startRef.current = null
    setRect(null)
    if (r.w > 12 && r.h > 12) onSelect(r)
    else onCancel()
  }

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001, cursor: 'crosshair',
        touchAction: 'none', background: 'rgba(0,0,0,0.04)',
      }}
    >
      {/* Instruction */}
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(20,18,30,0.85)', color: '#fff', padding: '8px 16px', borderRadius: 8,
        fontSize: 12.5, fontFamily: FONT, pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        드래그해서 캡쳐할 영역을 선택하세요 · ESC 취소
      </div>

      {/* Cancel button */}
      <button
        onPointerDown={(e) => { e.stopPropagation(); onCancel() }}
        style={{
          position: 'fixed', top: 14, right: 14, padding: '7px 12px', fontSize: 12, fontWeight: 600,
          background: '#fff', color: '#1a1a1a', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8,
          cursor: 'pointer', fontFamily: FONT,
        }}
      >
        취소
      </button>

      {rect && (
        <div style={{
          position: 'fixed', left: rect.left, top: rect.top, width: rect.w, height: rect.h,
          border: '2px solid #fc2b32', background: 'rgba(252,43,50,0.08)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.12)', pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
