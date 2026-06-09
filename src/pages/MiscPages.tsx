import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      background: '#fafafa', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      color: '#1a1a1a', padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, fontWeight: 700, color: '#fc2b32' }}>404</div>
      <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>없는 페이지입니다.</p>
      <Link to="/" style={{ fontSize: 12, color: '#fc2b32' }}>← 홈으로</Link>
    </div>
  )
}
