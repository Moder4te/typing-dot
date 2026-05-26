interface Props {
  message: string | null
}

export default function EmotionIndicator({ message }: Props) {
  if (!message) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 200,
        background: 'rgba(20,18,30,0.82)',
        color: 'rgba(255,255,255,0.88)',
        padding: '6px 14px',
        borderRadius: 3,
        fontSize: 11,
        letterSpacing: 0.8,
        pointerEvents: 'none',
        userSelect: 'none',
        animation: 'fadeInOut 3s ease forwards',
      }}
    >
      {message}
    </div>
  )
}
