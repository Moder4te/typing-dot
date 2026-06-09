import { useState } from 'react'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

export default function MigrationBanner({
  onImport, onDismiss,
}: {
  onImport: () => Promise<number>
  onDismiss: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  const run = async () => {
    setBusy(true)
    const n = await onImport()
    setBusy(false)
    setDone(n)
    setTimeout(onDismiss, 2500)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9996, background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
      borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
      fontFamily: FONT, color: '#1a1a1a', maxWidth: 'calc(100vw - 32px)',
    }}>
      {done === null ? (
        <>
          <span style={{ fontSize: 13 }}>이 기기에 저장된 이전 기록을 클라우드로 가져올까요?</span>
          <button onClick={run} disabled={busy} style={{
            padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#fc2b32',
            color: '#fff', border: 'none', borderRadius: 6, cursor: busy ? 'wait' : 'pointer', fontFamily: FONT,
          }}>{busy ? '가져오는 중…' : '가져오기'}</button>
          <button onClick={onDismiss} disabled={busy} style={{
            padding: '6px 10px', fontSize: 12, background: 'transparent',
            color: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer', fontFamily: FONT,
          }}>나중에</button>
        </>
      ) : (
        <span style={{ fontSize: 13, color: '#166534' }}>✓ {done}개 블록을 가져왔습니다.</span>
      )}
    </div>
  )
}
