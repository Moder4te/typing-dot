import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { setTierMock } from '../lib/billing'
import { FREE_AI_DAILY } from '../lib/entitlements'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

const FREE_FEATURES = [
  '타이핑 리듬 기반 폰트 변화 — 무제한',
  `AI 감정 분석 — 하루 ${FREE_AI_DAILY}회`,
  '감정별 손글씨 폰트 (랜덤 적용)',
  '최근 3개월 기록',
  '개인 일기장 + 공유 일기장',
]
const PRO_FEATURES = [
  'AI 감정 분석 — 무제한',
  '프리미엄 캔버스 테마',
  '전체 기록 보관 (무제한)',
  '인스타그램 이미지로 공유',
  '무료 기능 전부 포함',
]

export default function PricingPage() {
  const { profile, refreshProfile, configured } = useAuth()
  const tier = profile?.tier ?? 'free'
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const change = async (next: 'free' | 'pro') => {
    setBusy(true); setMsg('')
    try {
      await setTierMock(next)
      await refreshProfile()
      setMsg(next === 'pro' ? 'Pro로 전환되었습니다 🎉' : '무료 플랜으로 전환되었습니다.')
    } catch (e) {
      setMsg(`전환 실패: ${String((e as { message?: string })?.message ?? e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: FONT, color: '#1a1a1a' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>요금제</h1>
          <Link to="/" style={{ fontSize: 12, color: '#fc2b32' }}>← 캔버스로</Link>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginBottom: 20 }}>
          결제는 현재 데모(mock)입니다 — 실제 청구 없이 플랜이 전환됩니다.
        </p>
        {msg && <div style={{ fontSize: 13, color: '#fc2b32', marginBottom: 16 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Plan
            title="Free" price="₩0" features={FREE_FEATURES} current={tier === 'free'}
            action={tier === 'pro'
              ? <Btn ghost disabled={busy} onClick={() => change('free')}>무료로 전환</Btn>
              : <Btn ghost disabled>현재 플랜</Btn>}
          />
          <Plan
            title="Pro" price="₩4,900 / 월" highlight features={PRO_FEATURES} current={tier === 'pro'}
            action={tier === 'pro'
              ? <Btn ghost disabled>현재 플랜</Btn>
              : <Btn disabled={busy || !configured} onClick={() => change('pro')}>{busy ? '처리 중…' : 'Pro 업그레이드'}</Btn>}
          />
        </div>
      </div>
    </div>
  )
}

function Plan({ title, price, features, action, highlight, current }: {
  title: string; price: string; features: string[]; action: React.ReactNode
  highlight?: boolean; current?: boolean
}) {
  return (
    <div style={{
      flex: '1 1 280px', background: '#fff', borderRadius: 14, padding: 22,
      border: highlight ? '2px solid #fc2b32' : '1px solid rgba(0,0,0,0.1)',
      position: 'relative',
    }}>
      {current && (
        <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, color: '#fc2b32', fontWeight: 700, letterSpacing: 1 }}>현재</span>
      )}
      <div style={{ fontSize: 16, fontWeight: 700, color: highlight ? '#fc2b32' : '#1a1a1a' }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 16px' }}>{price}</div>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontSize: 13, color: 'rgba(0,0,0,0.7)', display: 'flex', gap: 8 }}>
            <span style={{ color: '#fc2b32' }}>✓</span>{f}
          </li>
        ))}
      </ul>
      {action}
    </div>
  )
}

function Btn({ children, onClick, disabled, ghost }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; ghost?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '11px 14px', fontSize: 14, fontWeight: 600, borderRadius: 8,
      cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: FONT,
      background: ghost ? 'transparent' : (disabled ? 'rgba(252,43,50,0.45)' : '#fc2b32'),
      color: ghost ? 'rgba(0,0,0,0.6)' : '#fff',
      border: ghost ? '1px solid rgba(0,0,0,0.18)' : 'none',
    }}>
      {children}
    </button>
  )
}
