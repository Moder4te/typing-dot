import * as htmlToImage from 'html-to-image'

export type ShareFormat = 'png' | 'jpeg'
export type ShareRatio = 'free' | 'square' | 'portrait'

export interface Rect { x: number; y: number; w: number; h: number }

const FRAMES: Record<'square' | 'portrait', [number, number]> = {
  square: [1080, 1080],
  portrait: [1080, 1350], // 4:5 — Instagram portrait
}

function watermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fs = Math.max(16, Math.round(w * 0.022))
  ctx.font = `600 ${fs}px "Helvetica Neue", Arial, sans-serif`
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.textAlign = 'right'
  ctx.fillText('Typing...', w - fs, h - fs)
}

// Captures a user-selected rectangular region of the canvas world layer (raw, 2x).
export async function renderRegion(world: HTMLElement, region: Rect, bg: string): Promise<HTMLCanvasElement> {
  const x = Math.max(0, region.x)
  const y = Math.max(0, region.y)
  const w = Math.max(1, region.w)
  const h = Math.max(1, region.h)
  return htmlToImage.toCanvas(world, {
    backgroundColor: bg,
    width: w,
    height: h,
    pixelRatio: 2,
    // The world layer is positioned (left/top = pan offset) and CSS-scaled (zoom).
    // html-to-image copies those into the clone but only lets us override `transform`,
    // so we must neutralise left/top/scale here — otherwise the capture is shifted by
    // the pan offset and rendered at the zoom scale. `x`/`y`/`w`/`h` are world coords.
    style: {
      left: '0px', top: '0px',
      transform: `translate(${-x}px, ${-y}px)`, transformOrigin: 'top left',
    },
    filter: (n) => !(n instanceof HTMLElement && n.dataset?.noexport === '1'),
  })
}

// Composes the raw capture into the chosen aspect ratio (letterboxed on bg),
// or returns it as-is for 'free'. Adds the watermark.
export function composeShare(src: HTMLCanvasElement, ratio: ShareRatio, bg: string): HTMLCanvasElement {
  const out = document.createElement('canvas')
  const ctx = out.getContext('2d')!

  if (ratio === 'free') {
    out.width = src.width; out.height = src.height
    ctx.drawImage(src, 0, 0)
  } else {
    const [W, H] = FRAMES[ratio]
    out.width = W; out.height = H
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const margin = 80
    const scale = Math.min((W - margin * 2) / src.width, (H - margin * 2) / src.height)
    const dw = src.width * scale, dh = src.height * scale
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh)
  }

  watermark(ctx, out.width, out.height)
  return out
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ShareFormat): Promise<Blob | null> {
  return new Promise(res => canvas.toBlob(res, format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92))
}

export function downloadCanvas(canvas: HTMLCanvasElement, format: ShareFormat): void {
  const url = canvas.toDataURL(format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92)
  const a = document.createElement('a')
  a.href = url
  a.download = `typing-dot.${format === 'jpeg' ? 'jpg' : 'png'}`
  a.click()
}
