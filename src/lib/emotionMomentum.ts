import type { EmotionLabel, EmotionFontMap } from '../types'

const DEFAULT_FONT = 'TD_neutral_1'

export interface MomentumResult {
  resolvedEmotion: EmotionLabel
  fontFamily: string
  newHistory: EmotionLabel[]
}

export function resolveEmotion(
  raw: EmotionLabel,
  history: EmotionLabel[],
  fontMap: EmotionFontMap
): MomentumResult {
  // Pick a random font variant for the emotion → fonts vary per block.
  const getFont = (e: EmotionLabel): string => {
    const key = (e === 'unclassified' ? 'neutral' : e) as keyof EmotionFontMap
    const fonts = fontMap[key]?.fonts
    if (!fonts || fonts.length === 0) return DEFAULT_FONT
    return fonts[Math.floor(Math.random() * fonts.length)].family
  }

  // neutral이 연속으로 이력에 쌓여도 마지막 의미있는 감정을 찾는다
  const lastMeaningful = (h: EmotionLabel[]): EmotionLabel =>
    [...h].reverse().find(e => e !== 'neutral') ?? 'neutral'

  // ① unclassified → 이전 의미있는 감정 유지, 이력 변경 없음
  if (raw === 'unclassified') {
    const prev = lastMeaningful(history)
    return { resolvedEmotion: prev, fontFamily: getFont(prev), newHistory: history }
  }

  // ② neutral + 이전 이력 있음 → 이력 내 감정 폰트 중 랜덤 선택 (블렌딩 표현)
  if (raw === 'neutral' && history.length > 0) {
    const pool = history.filter(e => e !== 'unclassified')
    const pick = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : 'neutral'
    const newHistory = [...history, 'neutral'].slice(-3) as EmotionLabel[]
    return { resolvedEmotion: pick, fontFamily: getFont(pick), newHistory }
  }

  const newHistory = [...history, raw].slice(-3) as EmotionLabel[]

  // ③ 동일 감정 2회 연속 → 확정 후 이력 리셋
  if (
    newHistory.length >= 2 &&
    newHistory[newHistory.length - 1] === newHistory[newHistory.length - 2]
  ) {
    return { resolvedEmotion: raw, fontFamily: getFont(raw), newHistory: [raw] }
  }

  return { resolvedEmotion: raw, fontFamily: getFont(raw), newHistory }
}
