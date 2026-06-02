import { useState } from 'react'

interface Props {
  onAnalyze: () => Promise<void>
}

export default function AnalyzeButton({ onAnalyze }: Props) {
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)
    try {
      await onAnalyze()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        top: 14,
        right: 14,
        zIndex: 9998,
        width: hovered || loading ? 'auto' : 28,
        height: hovered || loading ? 'auto' : 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Dot indicator when hidden */}
      {!hovered && !loading && (
        <div style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: 'rgba(252,43,50,0.35)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Button */}
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: hovered || loading ? 'block' : 'none',
          padding: '7px 16px',
          fontSize: 11,
          letterSpacing: 1.2,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          background: loading ? 'rgba(252,43,50,0.5)' : '#fc2b32',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(252,43,50,0.3)',
          transition: 'background 0.15s',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? '분석 중...' : '▶ 분석 시작'}
      </button>
    </div>
  )
}
