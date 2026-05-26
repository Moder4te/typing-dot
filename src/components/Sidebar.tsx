import { useState } from 'react'
import type { AppSettings } from '../types'
import SettingsPanel from './SettingsPanel'

// 9가지 레드 톤
const REDS = ['#ff9aa0','#ff6470','#ff3d4a','#fc2b32','#e02228','#c41920','#a81418','#8c1012','#700a0d']

const LOGO: { char: string; size: number; weight: number; color: string }[] = [
  { char: 'T', size: 22, weight: 700, color: REDS[3] },
  { char: 'y', size: 15, weight: 300, color: REDS[1] },
  { char: 'p', size: 19, weight: 500, color: REDS[4] },
  { char: 'i', size: 13, weight: 200, color: REDS[0] },
  { char: 'n', size: 18, weight: 400, color: REDS[5] },
  { char: 'g', size: 23, weight: 700, color: REDS[6] },
  { char: '.', size: 16, weight: 600, color: REDS[3] },
  { char: '.', size: 20, weight: 300, color: REDS[2] },
  { char: '.', size: 13, weight: 800, color: REDS[8] },
]

type Section = 'diary' | 'settings'

interface Props {
  months: string[]
  current: string
  settings: AppSettings
  onSelect: (month: string) => void
  onNewMonth: () => void
  onSettingsChange: (s: AppSettings) => void
}

export default function Sidebar({
  months,
  current,
  settings,
  onSelect,
  onNewMonth,
  onSettingsChange,
}: Props) {
  const [openSection, setOpenSection] = useState<Section>('diary')

  const toggle = (s: Section) => setOpenSection(prev => (prev === s ? 'diary' : s))

  return (
    <div
      style={{
        width: 190,
        height: '100%',
        background: '#f0ede6',
        borderRight: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {/* 로고 — Typing... */}
      <div style={{ padding: '22px 18px 16px', lineHeight: 1 }}>
        {LOGO.map((l, i) => (
          <span
            key={i}
            style={{
              fontSize: l.size,
              fontWeight: l.weight,
              color: l.color,
              fontFamily: '"Noto Serif KR", Georgia, serif',
            }}
          >
            {l.char}
          </span>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {/* Diary 섹션 */}
        <SectionHeader
          label="Diary"
          isOpen={openSection === 'diary'}
          onClick={() => toggle('diary')}
        />
        {openSection === 'diary' && (
          <div>
            {months.map(m => (
              <div
                key={m}
                onClick={() => onSelect(m)}
                style={{
                  padding: '8px 22px',
                  fontSize: 12,
                  cursor: 'pointer',
                  color: m === current ? '#1a1a1a' : 'rgba(0,0,0,0.4)',
                  fontWeight: m === current ? 600 : 400,
                  background: m === current ? 'rgba(252,43,50,0.06)' : 'transparent',
                  letterSpacing: 0.5,
                  borderLeft: m === current ? '2px solid #fc2b32' : '2px solid transparent',
                }}
              >
                {m}
              </div>
            ))}
            <div
              onClick={onNewMonth}
              style={{
                padding: '8px 22px',
                fontSize: 11,
                color: 'rgba(0,0,0,0.3)',
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              + 새 달
            </div>
          </div>
        )}

        {/* Settings 섹션 */}
        <SectionHeader
          label="Settings"
          isOpen={openSection === 'settings'}
          onClick={() => toggle('settings')}
        />
        {openSection === 'settings' && (
          <div style={{ padding: '8px 18px 16px' }}>
            <SettingsPanel settings={settings} onChange={onSettingsChange} />
          </div>
        )}
      </div>
    </div>
  )
}

function SectionHeader({
  label,
  isOpen,
  onClick,
}: {
  label: string
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 18px',
        fontSize: 10,
        letterSpacing: 1.5,
        color: isOpen ? '#fc2b32' : 'rgba(0,0,0,0.35)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderTop: '1px solid rgba(0,0,0,0.06)',
        userSelect: 'none',
        fontWeight: isOpen ? 600 : 400,
      }}
    >
      <span style={{ fontSize: 8, opacity: 0.7 }}>{isOpen ? '▾' : '▸'}</span>
      {label.toUpperCase()}
    </div>
  )
}
