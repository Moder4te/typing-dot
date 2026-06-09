import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18,
      background: '#fafafa', fontFamily: FONT, color: '#1a1a1a', padding: 24,
    }}>
      <Link to="/" style={{ fontSize: 30, fontWeight: 700, color: '#fc2b32', letterSpacing: -0.5, textDecoration: 'none' }}>
        typing<span style={{ color: '#1a1a1a' }}>.</span>
      </Link>
      <h1 style={{ fontSize: 17, fontWeight: 600 }}>{title}</h1>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
      {footer && <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.5)' }}>{footer}</div>}
    </div>
  )
}

export function Field({
  label, type = 'text', value, onChange, placeholder, autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 10, letterSpacing: 1, color: 'rgba(0,0,0,0.45)', fontFamily: FONT }}>{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '9px 11px', fontSize: 14, color: '#1a1a1a',
          border: '1px solid rgba(0,0,0,0.14)', borderRadius: 6,
          background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: FONT,
        }}
      />
    </label>
  )
}

export function PrimaryButton({ children, disabled, onClick, type = 'button' }: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 14px', fontSize: 13.5, fontWeight: 600, letterSpacing: 0.5,
        background: disabled ? 'rgba(252,43,50,0.45)' : '#fc2b32', color: '#fff',
        border: 'none', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: FONT, transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export function Notice({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  if (!children) return null
  return (
    <div style={{
      fontSize: 12, lineHeight: 1.5, padding: '8px 10px', borderRadius: 6,
      color: kind === 'error' ? '#b4232a' : '#166534',
      background: kind === 'error' ? 'rgba(252,43,50,0.08)' : 'rgba(22,101,52,0.08)',
      border: `1px solid ${kind === 'error' ? 'rgba(252,43,50,0.2)' : 'rgba(22,101,52,0.2)'}`,
    }}>
      {children}
    </div>
  )
}
