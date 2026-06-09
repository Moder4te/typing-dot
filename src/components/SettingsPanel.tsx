import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { FREE_AI_DAILY } from '../lib/entitlements'

// AI runs through the server proxy now — no API key is entered in the browser.
// This panel shows account/plan info and shortcuts.
export default function SettingsPanel() {
  const { profile, configured } = useAuth()
  const navigate = useNavigate()
  const tier = profile?.tier ?? 'free'

  const link: React.CSSProperties = {
    fontSize: 12, color: '#fc2b32', cursor: 'pointer', padding: '4px 0',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {configured ? (
        <>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)' }}>
            플랜: <b style={{ color: tier === 'pro' ? '#fc2b32' : 'inherit' }}>{tier.toUpperCase()}</b>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', lineHeight: 1.6, margin: '2px 0 6px' }}>
            {tier === 'pro'
              ? 'AI 감정 분석 무제한 이용 중.'
              : `무료 플랜: 하루 AI 분석 ${FREE_AI_DAILY}회. 타이핑 리듬 기반 변화는 무제한.`}
          </p>
          <div style={link} onClick={() => navigate('/settings')}>계정 설정 →</div>
          <div style={link} onClick={() => navigate('/pricing')}>요금제 보기 →</div>
        </>
      ) : (
        <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', lineHeight: 1.6 }}>
          로컬 모드입니다. 클라우드 저장·AI 분석을 쓰려면 로그인하세요.
        </p>
      )}
    </div>
  )
}
