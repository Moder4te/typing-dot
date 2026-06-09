import { useState } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { AuthShell, Field, PrimaryButton, Notice } from '../auth/authUi'

// ── Login ───────────────────────────────────────────────────
export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  const submit = async () => {
    if (!supabase || busy) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) { setError(translate(error.message)); return }
    navigate(from, { replace: true })
  }

  return (
    <AuthShell
      title="로그인"
      footer={<>계정이 없나요? <Link to="/signup" style={{ color: '#fc2b32' }}>회원가입</Link></>}
    >
      <form onSubmit={e => { e.preventDefault(); submit() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="EMAIL" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
        <Field label="PASSWORD" type="password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="••••••••" />
        <Notice kind="error">{error}</Notice>
        <PrimaryButton type="submit" disabled={busy || !email || !password}>{busy ? '로그인 중…' : '로그인'}</PrimaryButton>
      </form>
    </AuthShell>
  )
}

// ── Signup ──────────────────────────────────────────────────
export function SignupPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const validUsername = /^[a-zA-Z0-9_]{3,20}$/.test(username)

  const submit = async () => {
    if (!supabase || busy) return
    setError(''); setOk('')
    if (!validUsername) { setError('아이디는 영문·숫자·밑줄 3~20자.'); return }
    if (password.length < 8) { setError('비밀번호는 8자 이상.'); return }
    setBusy(true)

    // Pre-check username (anon-callable RPC)
    const { data: available } = await supabase.rpc('username_available', { name: username })
    if (available === false) { setBusy(false); setError('이미 사용 중인 아이디입니다.'); return }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username, display_name: username } },
    })
    setBusy(false)
    if (error) { setError(translate(error.message)); return }

    // Email confirmation ON → no session yet
    if (!data.session) {
      setOk('확인 메일을 보냈습니다. 메일의 링크를 눌러 인증 후 로그인하세요.')
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <AuthShell
      title="회원가입"
      footer={<>이미 계정이 있나요? <Link to="/login" style={{ color: '#fc2b32' }}>로그인</Link></>}
    >
      <form onSubmit={e => { e.preventDefault(); submit() }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="EMAIL" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
        <Field label="아이디 (USERNAME)" value={username} onChange={setUsername} autoComplete="username" placeholder="영문·숫자·밑줄 3~20자" />
        <Field label="PASSWORD" type="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="8자 이상" />
        <Notice kind="error">{error}</Notice>
        <Notice kind="ok">{ok}</Notice>
        <PrimaryButton type="submit" disabled={busy || !email || !username || !password}>{busy ? '가입 중…' : '회원가입'}</PrimaryButton>
      </form>
    </AuthShell>
  )
}

// Map common Supabase auth errors to Korean.
function translate(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (m.includes('already registered') || m.includes('already been registered')) return '이미 가입된 이메일입니다.'
  if (m.includes('email') && m.includes('confirm')) return '이메일 인증이 필요합니다. 메일을 확인하세요.'
  if (m.includes('rate limit')) return '잠시 후 다시 시도하세요.'
  return msg
}
