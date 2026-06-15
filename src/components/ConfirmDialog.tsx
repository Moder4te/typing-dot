import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface State {
  open: boolean
  opts: ConfirmOptions
  resolve?: (v: boolean) => void
}

/**
 * Promise-based confirm dialog. Usage:
 *   const { confirm, dialog } = useConfirm()
 *   ...render {dialog}...
 *   if (await confirm({ title: '…', message: '…' })) doIt()
 */
export function useConfirm() {
  const [state, setState] = useState<State>({ open: false, opts: { title: '' } })

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>(resolve => setState({ open: true, opts, resolve })),
    [],
  )

  const settle = useCallback((v: boolean) => {
    setState(s => { s.resolve?.(v); return { ...s, open: false } })
  }, [])

  // Portaled to <body> so it isn't clipped/offset by the sidebar's transform.
  const dialog = state.open
    ? createPortal(
        <ConfirmDialog opts={state.opts} onCancel={() => settle(false)} onConfirm={() => settle(true)} />,
        document.body,
      )
    : null

  return { confirm, dialog }
}

function ConfirmDialog({ opts, onCancel, onConfirm }: {
  opts: ConfirmOptions
  onCancel: () => void
  onConfirm: () => void
}) {
  const { title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', danger = true } = opts

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      else if (e.key === 'Enter') onConfirm()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, onConfirm])

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(20,18,24,0.34)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: FONT,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 320, background: '#fff', borderRadius: 14,
          padding: '20px 20px 16px', color: '#1a1a1a',
          boxShadow: '0 14px 44px rgba(0,0,0,0.24)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2 }}>{title}</div>
        {message && (
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: 'rgba(0,0,0,0.55)' }}>{message}</div>
        )}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={btnGhost}>{cancelLabel}</button>
          <button onClick={onConfirm} autoFocus style={danger ? btnDanger : btnPrimary}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

const btnBase: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 8,
  cursor: 'pointer', fontFamily: FONT,
}
const btnGhost: React.CSSProperties = {
  ...btnBase, background: 'transparent', color: 'rgba(0,0,0,0.55)', border: '1px solid rgba(0,0,0,0.15)',
}
const btnDanger: React.CSSProperties = {
  ...btnBase, background: '#fc2b32', color: '#fff', border: 'none',
}
const btnPrimary: React.CSSProperties = {
  ...btnBase, background: '#1a1a1a', color: '#fff', border: 'none',
}
