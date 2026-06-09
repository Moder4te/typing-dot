import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { Field, PrimaryButton, Notice } from '../auth/authUi'
import { entitlementsFor } from '../lib/entitlements'
import { THEMES, setTheme } from '../lib/theme'
import { useTheme } from '../hooks/useTheme'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

function LockedNote({ text, onUpgrade }: { text: string; onUpgrade: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.5)' }}>🔒 {text}</span>
      <button onClick={onUpgrade} style={{
        padding: '6px 12px', fontSize: 12, fontWeight: 600, background: '#fc2b32', color: '#fff',
        border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
      }}>Pro 보기</button>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <h2 style={{ fontSize: 12, letterSpacing: 1, color: 'rgba(0,0,0,0.5)', fontWeight: 600 }}>{title}</h2>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const flash = (kind: 'error' | 'ok', text: string) => setMsg({ kind, text })

  const saveProfile = async () => {
    if (!supabase || !user || busy) return
    setBusy(true); setMsg(null)
    if (username !== profile?.username) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setBusy(false); return flash('error', '아이디는 영문·숫자·밑줄 3~20자.') }
      const { data: ok } = await supabase.rpc('username_available', { name: username })
      if (ok === false) { setBusy(false); return flash('error', '이미 사용 중인 아이디입니다.') }
    }
    const { error } = await supabase.from('profiles')
      .update({ display_name: displayName, username }).eq('id', user.id)
    setBusy(false)
    if (error) return flash('error', error.message.includes('duplicate') ? '이미 사용 중인 아이디입니다.' : error.message)
    await refreshProfile()
    flash('ok', '저장되었습니다.')
  }

  const changePassword = async () => {
    if (!supabase || busy) return
    if (pw.length < 8) return flash('error', '비밀번호는 8자 이상.')
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return flash('error', error.message)
    setPw(''); flash('ok', '비밀번호가 변경되었습니다.')
  }

  const ent = entitlementsFor(profile?.tier ?? 'free')
  const theme = useTheme()

  const logout = async () => { await signOut(); navigate('/login', { replace: true }) }

  const deleteAccount = async () => {
    if (!supabase || busy) return
    if (!confirm('정말 탈퇴할까요? 모든 일기와 데이터가 영구 삭제되며 되돌릴 수 없습니다.')) return
    setBusy(true); setMsg(null)
    const { error } = await supabase.functions.invoke('delete-account')
    setBusy(false)
    if (error) return flash('error', '탈퇴 처리 실패(서버 함수 미배포일 수 있음). 잠시 후 다시 시도하세요.')
    await signOut()
    navigate('/signup', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: FONT, color: '#1a1a1a' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>계정 설정</h1>
          <Link to="/" style={{ fontSize: 12, color: '#fc2b32' }}>← 캔버스로</Link>
        </div>

        <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.45)' }}>
          {user?.email} · <span style={{ color: profile?.tier === 'pro' ? '#fc2b32' : 'rgba(0,0,0,0.45)' }}>{(profile?.tier ?? 'free').toUpperCase()}</span>
        </div>

        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

        <Card title="프로필">
          <Field label="표시 이름" value={displayName} onChange={setDisplayName} placeholder="이름" />
          <Field label="아이디 (USERNAME)" value={username} onChange={setUsername} autoComplete="username" />
          <PrimaryButton onClick={saveProfile} disabled={busy}>저장</PrimaryButton>
        </Card>

        <Card title="비밀번호 변경">
          <Field label="새 비밀번호" type="password" value={pw} onChange={setPw} autoComplete="new-password" placeholder="8자 이상" />
          <PrimaryButton onClick={changePassword} disabled={busy || !pw}>변경</PrimaryButton>
        </Card>

        <Card title="요금제">
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>
            현재: <b>{(profile?.tier ?? 'free').toUpperCase()}</b>
          </div>
          <Link to="/pricing" style={{ fontSize: 13, color: '#fc2b32' }}>요금제 보기 →</Link>
        </Card>

        <Card title="캔버스 테마">
          {ent.premiumFonts ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setTheme(t.id)} title={t.name} style={{
                  width: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  <span style={{
                    width: 48, height: 48, borderRadius: 8, background: t.bg,
                    backgroundImage: t.world, backgroundSize: t.worldSize,
                    border: theme.id === t.id ? '2px solid #fc2b32' : '1px solid rgba(0,0,0,0.15)',
                  }} />
                  <span style={{ fontSize: 10, color: theme.id === t.id ? '#fc2b32' : 'rgba(0,0,0,0.5)' }}>{t.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <LockedNote text="프리미엄 캔버스 테마는 Pro 전용입니다." onUpgrade={() => navigate('/pricing')} />
          )}
        </Card>

        <Card title="이미지로 공유">
          {ent.exportEnabled ? (
            <p style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.55)', margin: 0, lineHeight: 1.6 }}>
              캔버스 좌하단의 <b>📷 이미지로 공유</b> 버튼으로 인스타그램용 이미지(정사각형/세로)를 저장할 수 있어요.
            </p>
          ) : (
            <LockedNote text="이미지로 공유는 Pro 전용입니다." onUpgrade={() => navigate('/pricing')} />
          )}
        </Card>

        <Card title="계정">
          <button onClick={logout} style={{
            padding: '9px 14px', fontSize: 13, fontWeight: 600, background: 'transparent',
            color: '#1a1a1a', border: '1px solid rgba(0,0,0,0.18)', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
          }}>로그아웃</button>
          <button onClick={deleteAccount} disabled={busy} style={{
            padding: '9px 14px', fontSize: 12.5, background: 'transparent',
            color: '#b4232a', border: '1px solid rgba(180,35,42,0.3)', borderRadius: 6,
            cursor: busy ? 'not-allowed' : 'pointer', fontFamily: FONT,
          }}>회원 탈퇴</button>
        </Card>
      </div>
    </div>
  )
}
