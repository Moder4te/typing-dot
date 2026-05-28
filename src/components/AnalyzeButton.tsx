import { useState } from 'react'

interface Props {
  onAnalyze: () => Promise<void>
}

export default function AnalyzeButton({ onAnalyze }: Props) {
  const [loading, setLoading] = useState(false)

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
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 9998,
    }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: '8px 18px',
          fontSize: 11,
          letterSpacing: 1.2,
          fontFamily: 'monospace',
          background: loading ? 'rgba(252,43,50,0.5)' : '#fc2b32',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(252,43,50,0.35)',
          transition: 'background 0.15s',
          userSelect: 'none',
        }}
      >
        {loading ? '분석 중...' : '▶ 분석 시작'}
      </button>
    </div>
  )
}
