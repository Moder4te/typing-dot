import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

const STEPS = [
  { t: 'Typing... 에 오신 걸 환영해요', d: '무엇을 썼는지보다 어떤 상태로 쓰고 있었는지를 글씨에 새기는 감정 캔버스예요. 1분만 둘러볼까요?' },
  { t: '① 빈 곳을 눌러 쓰기', d: '빈 캔버스를 클릭(모바일은 탭)하면 그 자리에 글을 쓸 수 있어요. 빠르게 치면 크고 굵게, 망설이면 작고 기울어집니다.' },
  { t: '② 감정이 폰트가 됩니다', d: '15자 이상 쓰고 잠깐 멈추면 AI가 감정을 분석해 어울리는 글꼴로 바꿔줘요. (무료: 하루 20회)' },
  { t: '③ 길게 눌러 색 선택', d: '캔버스를 길게 누른 채 드래그하면 색상 휠이 나와요. 좌하단 ● 버튼으로 원하는 색 4개를 등록할 수 있어요.' },
  { t: '④ 기록 · 공유', d: '왼쪽 사이드바에서 월별 기록·내 일기장·공유 일기장·친구를 관리하고, 좌하단 📷 로 인스타그램용 이미지를 만들 수 있어요.' },
]

export default function Onboarding() {
  const { profile, refreshProfile } = useAuth()
  const [i, setI] = useState(0)
  const [done, setDone] = useState(false)

  if (!profile || profile.onboarded || done) return null

  const finish = async () => {
    setDone(true)
    if (supabase) await supabase.from('profiles').update({ onboarded: true }).eq('id', profile.id)
    await refreshProfile()
  }

  const last = i === STEPS.length - 1
  const step = STEPS[i]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 26, width: 'min(380px, 92vw)',
        color: '#1a1a1a', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fc2b32', letterSpacing: -0.5 }}>Typing<span style={{ color: '#1a1a1a' }}>...</span></div>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{step.t}</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(0,0,0,0.6)' }}>{step.d}</p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((_, idx) => (
            <span key={idx} style={{
              width: idx === i ? 18 : 6, height: 6, borderRadius: 3,
              background: idx === i ? '#fc2b32' : 'rgba(0,0,0,0.15)', transition: 'width 0.2s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <button onClick={finish} style={{
            background: 'none', border: 'none', fontSize: 12.5, color: 'rgba(0,0,0,0.4)', cursor: 'pointer', fontFamily: FONT,
          }}>
            건너뛰기
          </button>
          <button
            onClick={() => last ? finish() : setI(i + 1)}
            style={{
              padding: '9px 20px', fontSize: 13.5, fontWeight: 600, borderRadius: 8,
              background: '#fc2b32', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT,
            }}
          >
            {last ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
