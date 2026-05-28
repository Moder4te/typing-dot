export type EmotionLabel =
  | 'joy' | 'sadness' | 'anger' | 'fear'
  | 'calm' | 'surprise' | 'neutral' | 'unclassified'

export type AIProvider = 'openrouter'

export interface TextBlock {
  id: string
  x: number
  y: number
  text: string
  createdAt: number
  strokes: StrokeRecord[]
  // Emotion state
  emotion: EmotionLabel
  emotionHistory: EmotionLabel[]  // 최근 3개 블록 감정 이력 스냅샷
  // Typography (saved on blur, computed from strokes)
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

export interface InkParticle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  decay: number
  angle: number
  scaleX: number
  scaleY: number
}

export interface CanvasEntry {
  id: string
  userId: string | null
  yearMonth: string
  blocks: TextBlock[]
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  openrouterApiKey: string
  provider: AIProvider
}

export interface EmotionFontEntry {
  family: string
  google: string
}

export type EmotionFontMap = Record<Exclude<EmotionLabel, 'unclassified'>, EmotionFontEntry>
