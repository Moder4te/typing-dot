interface Props {
  message: string | null
}

export default function EmotionIndicator({ message }: Props) {
  if (!message) return null

  return (
    // Outer wrapper owns horizontal centering; inner owns the fade/slide
    // animation (which animates transform and would otherwise clobber centering).
    <div style={{
      position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, pointerEvents: 'none',
    }}>
      <div
        style={{
          whiteSpace: 'nowrap',
          background: 'rgba(20,18,30,0.82)',
          color: 'rgba(255,255,255,0.88)',
          padding: '6px 14px',
          borderRadius: 3,
          fontSize: 11,
          letterSpacing: 0.8,
          userSelect: 'none',
          animation: 'fadeInOut 3s ease forwards',
        }}
      >
        {message}
      </div>
    </div>
  )
}
