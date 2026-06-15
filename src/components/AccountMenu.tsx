import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

// Inline account section, designed to live at the bottom of the sidebar.
export default function AccountMenu() {
  const { configured, session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Not logged in (or Supabase not set up) → simple login row.
  if (!configured || !session) {
    return (
      <button
        onClick={() => navigate('/login')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '12px 18px', border: 'none',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          background: 'transparent', cursor: 'pointer', fontFamily: FONT,
          fontSize: 12, fontWeight: 600, color: '#fc2b32', textAlign: 'left',
        }}
      >
        <span style={avatar}>?</span>
        로그인
      </button>
    )
  }

  const initial = (profile?.display_name ?? profile?.username ?? '?').charAt(0).toUpperCase()

  return (
    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={profile?.username}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '11px 18px', border: 'none', background: 'transparent',
          cursor: 'pointer', fontFamily: FONT, textAlign: 'left',
        }}
      >
        <span style={avatar}>{initial}</span>
        <span style={{ flex: 1, overflow: 'hidden' }}>
          <span style={{
            display: 'block', fontSize: 12, fontWeight: 600, color: '#1a1a1a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {profile?.display_name ?? profile?.username}
          </span>
          <span style={{ display: 'block', fontSize: 10, color: 'rgba(0,0,0,0.4)' }}>
            @{profile?.username} · {(profile?.tier ?? 'free').toUpperCase()}
          </span>
        </span>
        <span style={{ fontSize: 9, opacity: 0.5 }}>{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div style={{ paddingBottom: 8 }}>
          <button style={item} onClick={() => navigate('/pricing')}>요금제</button>
          <button style={item} onClick={() => navigate('/settings')}>계정 설정</button>
          <button
            style={{ ...item, color: '#b4232a' }}
            onClick={async () => { setOpen(false); await signOut(); navigate('/login') }}
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

const avatar: React.CSSProperties = {
  width: 24, height: 24, borderRadius: '50%', background: '#fc2b32', color: '#fff',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 700, flexShrink: 0,
}

const item: React.CSSProperties = {
  padding: '8px 18px 8px 40px', fontSize: 12, color: '#1a1a1a', cursor: 'pointer',
  textAlign: 'left', background: 'transparent', border: 'none', width: '100%', fontFamily: FONT,
}
