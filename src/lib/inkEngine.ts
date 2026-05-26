import type { InkParticle } from '../types'

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

export function spawnParticles(
  x: number,
  y: number,
  iki: number,
  isBackspace: boolean
): InkParticle[] {
  const particles: InkParticle[] = []

  let count: number
  let radiusRange: [number, number]
  let speedRange: [number, number]
  let opacityBase: number

  if (isBackspace) {
    count = Math.floor(rand(8, 14))
    radiusRange = [3, 8]
    speedRange = [1.5, 3.5]
    opacityBase = rand(0.55, 0.75)
  } else if (iki < 100) {
    count = Math.floor(rand(4, 8))
    radiusRange = [2, 6]
    speedRange = [1.0, 2.5]
    opacityBase = rand(0.6, 0.85)
  } else if (iki < 500) {
    count = Math.floor(rand(6, 12))
    radiusRange = [3, 9]
    speedRange = [0.6, 2.0]
    opacityBase = rand(0.5, 0.75)
  } else {
    // 긴 멈춤 — 아래로 흘러내림
    count = Math.floor(rand(10, 20))
    radiusRange = [4, 14]
    speedRange = [0.3, 1.5]
    opacityBase = rand(0.45, 0.65)
  }

  const randomnessFactor = rand(0.8, 2.0)

  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2)
    const speed = rand(...speedRange) * randomnessFactor
    const gravityBias = iki >= 500 ? rand(0.15, 0.5) : 0

    particles.push({
      x: x + rand(-3, 3),
      y: y + rand(-3, 3),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + gravityBias,
      radius: rand(...radiusRange) * rand(0.7, 1.6),
      opacity: opacityBase * rand(0.7, 1.1),
      decay: rand(0.012, 0.028),
      angle: rand(0, Math.PI),
      scaleX: rand(0.5, 1.3),
      scaleY: rand(0.5, 1.3),
    })
  }

  return particles
}

export function tickParticles(particles: InkParticle[]): {
  active: InkParticle[]
  settled: InkParticle[]
} {
  const active: InkParticle[] = []
  const settled: InkParticle[] = []

  for (const p of particles) {
    const updated: InkParticle = {
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vx: p.vx * 0.84,
      vy: p.vy * 0.84,
      radius: p.radius * 1.015,
      opacity: p.opacity - p.decay,
    }

    const speed = Math.sqrt(updated.vx ** 2 + updated.vy ** 2)

    if (speed < 0.06 || updated.opacity <= 0.04) {
      settled.push(updated)
    } else {
      active.push(updated)
    }
  }

  return { active, settled }
}

export function paintBlob(ctx: CanvasRenderingContext2D, p: InkParticle) {
  const rx = p.radius * p.scaleX
  const ry = p.radius * p.scaleY

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry))
  gradient.addColorStop(0, `rgba(10, 8, 20, ${Math.min(p.opacity, 1) * 0.88})`)
  gradient.addColorStop(0.45, `rgba(10, 8, 20, ${Math.min(p.opacity, 1) * 0.45})`)
  gradient.addColorStop(0.8, `rgba(10, 8, 20, ${Math.min(p.opacity, 1) * 0.12})`)
  gradient.addColorStop(1, `rgba(10, 8, 20, 0)`)

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.angle)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.ellipse(0, 0, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawActiveParticles(
  ctx: CanvasRenderingContext2D,
  particles: InkParticle[]
) {
  for (const p of particles) {
    paintBlob(ctx, p)
  }
}
