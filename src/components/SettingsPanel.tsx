import type { AppSettings, AIProvider } from '../types'

interface Props {
  settings: AppSettings
  onChange: (s: AppSettings) => void
}

export default function SettingsPanel({ settings, onChange }: Props) {
  return (
    <div style={{ padding: '4px 0 0' }}>
      <Label>AI PROVIDER</Label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['claude', 'gemini'] as AIProvider[]).map(p => (
          <button
            key={p}
            onClick={() => onChange({ ...settings, provider: p })}
            style={{
              flex: 1,
              padding: '5px 0',
              fontSize: 10,
              letterSpacing: 1,
              border: '1px solid',
              borderColor: settings.provider === p ? '#fc2b32' : 'rgba(0,0,0,0.15)',
              background: settings.provider === p ? '#fc2b32' : 'transparent',
              color: settings.provider === p ? '#fff' : 'rgba(0,0,0,0.5)',
              borderRadius: 2,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <KeyInput
        label="CLAUDE API KEY"
        value={settings.claudeApiKey}
        onChange={v => onChange({ ...settings, claudeApiKey: v })}
      />
      <KeyInput
        label="GEMINI API KEY"
        value={settings.geminiApiKey}
        onChange={v => onChange({ ...settings, geminiApiKey: v })}
      />

      <p style={{ fontSize: 10, color: 'rgba(0,0,0,0.35)', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
        키 없이도 타이핑 리듬 기반 폰트 변화는 동작합니다.
        AI 감정 분석은 API 키 입력 후 활성화됩니다.
      </p>
    </div>
  )
}

function Label({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', letterSpacing: 1.2, marginBottom: 6 }}>
      {children}
    </div>
  )
}

function KeyInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      <input
        type="password"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="키를 입력하세요..."
        style={{
          width: '100%',
          padding: '6px 8px',
          fontSize: 11,
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 2,
          background: 'rgba(255,255,255,0.6)',
          outline: 'none',
          boxSizing: 'border-box',
          color: '#1a1a1a',
          fontFamily: 'monospace',
        }}
      />
    </div>
  )
}
