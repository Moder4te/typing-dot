import { useEffect, useRef, useCallback } from 'react'

// ── color math ──────────────────────────────────────────────
function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let rgb: [number, number, number]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return [Math.round((rgb[0] + m) * 255), Math.round((rgb[1] + m) * 255), Math.round((rgb[2] + m) * 255)]
}
function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}
function hexToHsv(hexStr: string): { h: number; s: number; v: number } {
  let h = hexStr.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  if ([r, g, b].some(Number.isNaN)) return { h: 0, s: 0, v: 0.1 }
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let hue = 0
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60; if (hue < 0) hue += 360
  }
  return { h: hue, s: max === 0 ? 0 : d / max, v: max }
}

// ── component ───────────────────────────────────────────────
export default function ColorWheel({
  value, onChange, size = 180,
}: {
  value: string
  onChange: (hex: string) => void
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { h, s, v } = hexToHsv(value)
  const r = size / 2

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - r, dy = y - r
        const dist = Math.hypot(dx, dy)
        const i = (y * size + x) * 4
        if (dist <= r) {
          const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360
          const [rr, gg, bb] = hsv2rgb(hue, Math.min(1, dist / r), v)
          img.data[i] = rr; img.data[i + 1] = gg; img.data[i + 2] = bb
          img.data[i + 3] = dist > r - 1.5 ? 150 : 255 // soft edge
        } else { img.data[i + 3] = 0 }
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [v, size, r])

  const pickAt = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const dx = clientX - rect.left - r
    const dy = clientY - rect.top - r
    const dist = Math.min(r, Math.hypot(dx, dy))
    const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360
    const [rr, gg, bb] = hsv2rgb(hue, dist / r, v)
    onChange(toHex(rr, gg, bb))
  }, [r, v, onChange])

  const onPointer = (e: React.PointerEvent) => {
    if (e.buttons === 0 && e.type === 'pointermove') return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    pickAt(e.clientX, e.clientY)
  }

  // marker position from current h,s
  const mx = r + Math.cos(h * Math.PI / 180) * s * r
  const my = r + Math.sin(h * Math.PI / 180) * s * r

  const setV = (nv: number) => {
    const [rr, gg, bb] = hsv2rgb(h, s, nv)
    onChange(toHex(rr, gg, bb))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size, touchAction: 'none' }}>
        <canvas
          ref={canvasRef} width={size} height={size}
          style={{ borderRadius: '50%', cursor: 'crosshair', display: 'block' }}
          onPointerDown={onPointer}
          onPointerMove={onPointer}
        />
        <div style={{
          position: 'absolute', left: mx, top: my, width: 14, height: 14, marginLeft: -7, marginTop: -7,
          borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          background: value, pointerEvents: 'none',
        }} />
      </div>
      <input
        type="range" min={0} max={100} value={Math.round(v * 100)}
        onChange={e => setV(Number(e.target.value) / 100)}
        style={{ width: size, accentColor: '#fc2b32' }}
      />
    </div>
  )
}
