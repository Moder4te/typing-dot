export type EmotionLabel =
  | 'joy' | 'delight' | 'calm' | 'sadness'
  | 'melancholy' | 'anxiety' | 'anger'
  | 'neutral' | 'unclassified'

// Per-character typography. Persisted so the rhythm-driven look survives reload.
export interface CharStyle {
  char: string
  fontSize: number
  fontWeight: number
  isItalic: boolean
  color?: string        // glyph color (default near-black); chosen via the radial quick menu
}

export interface TextBlock {
  id: string
  x: number
  y: number
  text: string
  createdAt: number
  strokes: StrokeRecord[]
  charStyles: CharStyle[]         // per-character style snapshot (fixes reload data loss)
  // Emotion state
  emotion: EmotionLabel
  emotionHistory: EmotionLabel[]  // 최근 3개 블록 감정 이력 스냅샷
  // Typography (block-level fallback when charStyles absent)
  fontFamily: string
  fontSize: number      // multiplier: 0.7 ~ 1.4
  fontWeight: number    // 200 | 300 | 400 | 700
  isItalic: boolean
}

export interface StrokeRecord {
  charIndex: number
  timestamp: number
  iki: number           // inter-key interval ms
  isBackspace: boolean
}

export interface CanvasEntry {
  id: string
  userId: string | null
  yearMonth: string
  blocks: TextBlock[]
  createdAt: number
  updatedAt: number
}

export interface FontVariant {
  family: string
  file: string
}

export interface EmotionFontEntry {
  fonts: FontVariant[]   // multiple fonts per emotion; one is picked at random per block
}

export type EmotionFontMap = Record<Exclude<EmotionLabel, 'unclassified'>, EmotionFontEntry>
