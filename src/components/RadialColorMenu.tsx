// Visual-only radial quick menu shown while holding+dragging on the canvas.
// 4 palette colors arranged around the press point; the highlighted one is
// selected by drag direction (selection logic lives in InfiniteCanvas).
const ANGLES = [-90, 0, 90, 180] // top, right, bottom, left (deg)
const RADIUS = 54

export default function RadialColorMenu({
  x, y, palette, selected,
}: {
  x: number; y: number; palette: string[]; selected: number | null
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }}>
      {/* center hub */}
      <div style={{
        position: 'fixed', left: x, top: y, width: 14, height: 14, marginLeft: -7, marginTop: -7,
        borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
      }} />
      {palette.map((c, i) => {
        const a = (ANGLES[i] * Math.PI) / 180
        const cx = x + Math.cos(a) * RADIUS
        const cy = y + Math.sin(a) * RADIUS
        const on = selected === i
        const size = on ? 44 : 34
        return (
          <div key={i} style={{
            position: 'fixed', left: cx, top: cy, width: size, height: size,
            marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%', background: c,
            border: on ? '3px solid #fff' : '2px solid rgba(255,255,255,0.85)',
            boxShadow: on ? '0 0 0 2px rgba(0,0,0,0.25), 0 4px 14px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.25)',
            transition: 'width 0.08s, height 0.08s',
          }} />
        )
      })}
    </div>
  )
}
