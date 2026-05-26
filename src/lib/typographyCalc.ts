import type { StrokeRecord } from '../types'

export interface TypographyProps {
  fontSize: number
  fontWeight: number
  isItalic: boolean
}

export const BASE_FONT_SIZE = 18

export function calcTypography(
  strokes: StrokeRecord[],
  consecutiveBackspaces: number
): TypographyProps {
  const valid = strokes.filter(s => !s.isBackspace && s.iki > 0 && s.iki < 5000)
  const recent = valid.slice(-10)

  if (recent.length < 3) {
    return { fontSize: 1.0, fontWeight: 400, isItalic: consecutiveBackspaces >= 3 }
  }

  const avg = recent.reduce((sum, s) => sum + s.iki, 0) / recent.length

  let fontSize: number
  let fontWeight: number
  let isItalic: boolean

  if (avg < 150) {
    fontSize = 1.4; fontWeight = 700; isItalic = false
  } else if (avg < 400) {
    fontSize = 1.0; fontWeight = 400; isItalic = false
  } else if (avg < 900) {
    fontSize = 0.85; fontWeight = 300; isItalic = false
  } else {
    fontSize = 0.7; fontWeight = 200; isItalic = true
  }

  return { fontSize, fontWeight, isItalic: isItalic || consecutiveBackspaces >= 3 }
}
