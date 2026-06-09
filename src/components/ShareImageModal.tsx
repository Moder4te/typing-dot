import { useEffect, useRef, useState, useCallback } from 'react'
import {
  renderRegion, composeShare, downloadCanvas, canvasToBlob,
  type ShareFormat, type ShareRatio, type Rect,
} from '../lib/imageExport'
import type { ClientRect } from './SelectionOverlay'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'

export default function ShareImageModal({
  selection, background, onClose,
}: {
  selection: ClientRect
  background: string
  onClose: () => void
}) {
  const [ratio, setRatio] = useState<ShareRatio>('portrait') // 4:5 default
  const [format, setFormat] = useState<ShareFormat>('png')
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const srcRef = useRef<HTMLCanvasElement | null>(null)   // raw captured region
  const outRef = useRef<HTMLCanvasElement | null>(null)   // composed output

  const recompose = useCallback((r: ShareRatio) => {
    const src = srcRef.current
    if (!src) return
    const out = composeShare(src, r, background)
    outRef.current = out
    setPreview(out.toDataURL('image/png'))
  }, [background])

  // Capture the selected region once.
  useEffect(() => {
    void (async () => {
      setBusy(true); setError('')
      const world = document.getElementById('td-world')
      if (!world) { setBusy(false); setError('캔버스를 찾을 수 없습니다.'); return }
      const wr = world.getBoundingClientRect()
      const region: Rect = { x: selection.left - wr.left, y: selection.top - wr.top, w: selection.w, h: selection.h }
      try {
        srcRef.current = await renderRegion(world, region, background)
        recompose(ratio)
      } catch (e) {
        setError(`이미지 생성 실패: ${String((e as { message?: string })?.message ?? e)}`)
      } finally {
        setBusy(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, background])

  const pickRatio = (r: ShareRatio) => { setRatio(r); recompose(r) }

  const copyImage = useCallback(async () => {
    const c = outRef.current
    if (!c) return
    const blob = await canvasToBlob(c, 'png')
    if (!blob) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch {
      if (preview) window.open(preview, '_blank')
    }
  }, [preview])

  const shareNative = useCallback(async () => {
    const c = outRef.current
    if (!c) return
    const blob = await canvasToBlob(c, format)
    if (!blob) return
    const file = new File([blob], `typing-dot.${format === 'jpeg' ? 'jpg' : 'png'}`, { type: blob.type })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'typing.' })
      }
    } catch { /* user cancelled */ }
  }, [format])

  const openTab = useCallback(() => { if (preview) window.open(preview, '_blank') }, [preview])

  const action: React.CSSProperties = {
    flex: 1, padding: '9px 10px', fontSize: 12, fontWeight: 600, borderRadius: 8, fontFamily: FONT,
    cursor: (!preview || busy) ? 'not-allowed' : 'pointer',
  }
  const ghost: React.CSSProperties = { ...action, background: 'transparent', color: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.15)' }
  const tab = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
    background: active ? '#fc2b32' : 'transparent', color: active ? '#fff' : 'rgba(0,0,0,0.55)',
    border: active ? 'none' : '1px solid rgba(0,0,0,0.15)',
  })

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: 20, width: 'min(440px, 92vw)',
        fontFamily: FONT, color: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: 14,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>이미지로 공유</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'rgba(0,0,0,0.4)' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tab(ratio === 'portrait')} onClick={() => pickRatio('portrait')}>세로 4:5</button>
          <button style={tab(ratio === 'square')} onClick={() => pickRatio('square')}>정사각형 1:1</button>
          <button style={tab(ratio === 'free')} onClick={() => pickRatio('free')}>자유</button>
        </div>

        <div style={{
          background: '#f3f3f3', borderRadius: 10, minHeight: 160,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {busy ? <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>이미지 생성 중…</span>
            : error ? <span style={{ fontSize: 12, color: '#b4232a', padding: 20, textAlign: 'center' }}>{error}</span>
            : preview ? <img src={preview} alt="공유 이미지" style={{ maxWidth: '100%', maxHeight: '50vh', display: 'block', touchAction: 'manipulation' }} />
            : null}
        </div>

        {preview && !busy && (
          <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', margin: 0, textAlign: 'center' }}>
            모바일은 이미지를 <b>길게 눌러 저장</b>하거나 <b>공유</b>로 인스타그램 전송.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>형식</span>
          <button style={tab(format === 'png')} onClick={() => setFormat('png')}>PNG</button>
          <button style={tab(format === 'jpeg')} onClick={() => setFormat('jpeg')}>JPEG</button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canNativeShare && (
            <button disabled={!preview || busy} onClick={shareNative}
              style={{ ...action, background: (!preview || busy) ? 'rgba(252,43,50,0.45)' : '#fc2b32', color: '#fff', border: 'none' }}>
              공유 (인스타그램…)
            </button>
          )}
          <button disabled={!preview || busy} onClick={copyImage} style={ghost}>{copied ? '✓ 복사됨' : '클립보드 복사'}</button>
          <button disabled={!preview || busy} onClick={openTab} style={ghost}>새 탭</button>
          <button disabled={!preview || busy}
            onClick={() => outRef.current && downloadCanvas(outRef.current, format)}
            style={{ ...action, background: (!preview || busy) ? 'rgba(252,43,50,0.45)' : '#fc2b32', color: '#fff', border: 'none' }}>
            다운로드
          </button>
        </div>
      </div>
    </div>
  )
}
