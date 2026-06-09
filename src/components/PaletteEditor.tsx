import { useState } from 'react'
import { setPalette } from '../lib/palette'
import ColorWheel from './ColorWheel'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

// Registers the 4 quick-menu colors via a color wheel, and sets the current ink color.
export default function PaletteEditor({
  palette, current, onPickCurrent, onClose,
}: {
  palette: string[]
  current: string
  onPickCurrent: (c: string) => void
  onClose: () => void
}) {
  const [colors, setColors] = useState<string[]>(palette)
  const [slot, setSlot] = useState(0)

  const update = (hex: string) => {
    const next = colors.map((c, idx) => idx === slot ? hex : c)
    setColors(next)
    setPalette(next)
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: 20, width: 'min(300px, 92vw)',
        fontFamily: FONT, color: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>글씨 색 · 퀵메뉴</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'rgba(0,0,0,0.4)' }}>×</button>
        </div>

        {/* 4 slots */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {colors.map((c, i) => (
            <button key={i} onClick={() => setSlot(i)} style={{
              width: 40, height: 40, borderRadius: '50%', background: c, cursor: 'pointer',
              border: slot === i ? '3px solid #fc2b32' : '2px solid rgba(0,0,0,0.12)',
            }} />
          ))}
        </div>

        <ColorWheel value={colors[slot]} onChange={update} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text" value={colors[slot]} onChange={e => update(e.target.value)}
            style={{ flex: 1, padding: '7px 9px', fontSize: 12, fontFamily: 'monospace', border: '1px solid rgba(0,0,0,0.14)', borderRadius: 6, outline: 'none' }}
          />
          <button
            onClick={() => { onPickCurrent(colors[slot]); onClose() }}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, fontFamily: FONT, cursor: 'pointer',
              background: current === colors[slot] ? '#fc2b32' : '#1a1a1a', color: '#fff', border: 'none',
            }}
          >
            이 색 사용
          </button>
        </div>
        <p style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.4)', margin: 0, lineHeight: 1.5 }}>
          4개 색을 등록하면 캔버스를 <b>길게 눌러 드래그</b>할 때 휠 퀵메뉴로 고를 수 있어요.
        </p>
      </div>
    </div>
  )
}
