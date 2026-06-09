import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

export default function AccountMenu() {
  const { configured, session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Not logged in (or Supabase not set up) → simple login link.
  if (!configured || !session) {
    return (
      <button
        onClick={() => navigate('/login')}
        style={{
          position: 'fixed', top: 14, right: 14, zIndex: 9997,
          padding: '7px 14px', fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
          background: '#fc2b32', color: '#fff', border: 'none', borderRadius: 6,
          cursor: 'pointer', fontFamily: FONT, boxShadow: '0 2px 8px rgba(252,43,50,0.3)',
        }}
      >
        로그인
      </button>
    )
  }

  const initial = (profile?.display_name ?? profile?.username ?? '?').charAt(0).toUpperCase()
  const item: React.CSSProperties = {
    padding: '9px 14px', fontSize: 13, color: '#1a1a1a', cursor: 'pointer',
    textAlign: 'left', background: 'transparent', border: 'none', width: '100%', fontFamily: FONT,
  }

  return (
    <div ref={ref} style={{ position: 'fixed', top: 14, right: 14, zIndex: 9997 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={profile?.username}
        style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: '#fc2b32', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: FONT,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {initial}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 40, right: 0, width: 168,
          background: '#fff', borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(0,0,0,0.16)', border: '1px solid rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{profile?.display_name ?? profile?.username}</div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>@{profile?.username} · {(profile?.tier ?? 'free').toUpperCase()}</div>
          </div>
          <button style={item} onClick={() => { setOpen(false); navigate('/pricing') }}>요금제</button>
          <button style={item} onClick={() => { setOpen(false); navigate('/settings') }}>계정 설정</button>
          <button
            style={{ ...item, color: '#b4232a', borderTop: '1px solid rgba(0,0,0,0.06)' }}
            onClick={async () => { setOpen(false); await signOut(); navigate('/login') }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}
