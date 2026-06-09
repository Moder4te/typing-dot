import { Component, type ReactNode } from 'react'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

interface State { hasError: boolean }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State { return { hasError: true } }

  componentDidCatch(error: unknown) { console.error('[typing-dot] render error', error) }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: '#fafafa', fontFamily: FONT, color: '#1a1a1a', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fc2b32' }}>typing<span style={{ color: '#1a1a1a' }}>.</span></div>
        <p style={{ fontSize: 14 }}>문제가 발생했어요.</p>
        <button onClick={() => location.reload()} style={{
          padding: '10px 18px', fontSize: 13, fontWeight: 600, background: '#fc2b32', color: '#fff',
          border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: FONT,
        }}>
          새로고침
        </button>
      </div>
    )
  }
}
