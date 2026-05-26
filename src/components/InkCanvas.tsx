import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { InkParticle } from '../types'
import { tickParticles, drawActiveParticles, paintBlob } from '../lib/inkEngine'

export interface InkCanvasHandle {
  addParticles: (particles: InkParticle[]) => void
  getSnapshot: () => string
}

interface Props {
  width: number
  height: number
}

const InkCanvas = forwardRef<InkCanvasHandle, Props>(({ width, height }, ref) => {
  const permRef = useRef<HTMLCanvasElement>(null)   // 영구 잉크층
  const activeRef = useRef<HTMLCanvasElement>(null) // 애니메이션층
  const particlesRef = useRef<InkParticle[]>([])
  const rafRef = useRef<number>(0)

  useImperativeHandle(ref, () => ({
    addParticles(newParticles: InkParticle[]) {
      particlesRef.current = [...particlesRef.current, ...newParticles]
    },
    getSnapshot() {
      const merged = document.createElement('canvas')
      merged.width = width
      merged.height = height
      const ctx = merged.getContext('2d')!
      if (permRef.current) ctx.drawImage(permRef.current, 0, 0)
      if (activeRef.current) ctx.drawImage(activeRef.current, 0, 0)
      return merged.toDataURL('image/png')
    },
  }))

  useEffect(() => {
    const perm = permRef.current
    const active = activeRef.current
    if (!perm || !active) return
    const permCtx = perm.getContext('2d')!
    const activeCtx = active.getContext('2d')!

    const loop = () => {
      activeCtx.clearRect(0, 0, width, height)

      const { active: still, settled } = tickParticles(particlesRef.current)
      particlesRef.current = still

      // 정착한 파티클 → 영구 캔버스에 그림
      for (const p of settled) {
        paintBlob(permCtx, p)
      }

      // 움직이는 파티클 → 애니메이션 캔버스
      drawActiveParticles(activeCtx, still)

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [width, height])

  const sharedStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    filter: 'blur(0.6px)',
  }

  return (
    <>
      <canvas ref={permRef} width={width} height={height} style={sharedStyle} />
      <canvas ref={activeRef} width={width} height={height} style={{ ...sharedStyle, filter: 'blur(0.8px)' }} />
    </>
  )
})

export default InkCanvas
