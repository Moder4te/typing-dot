import type { EmotionLabel, EmotionFontMap } from '../types'

const DEFAULT_FONT = 'Noto Serif KR'

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
  const getFont = (e: EmotionLabel): string =>
    e === 'unclassified'
      ? (fontMap['neutral']?.family ?? DEFAULT_FONT)
      : (fontMap[e as keyof EmotionFontMap]?.family ?? DEFAULT_FONT)

  // neutral이 연속으로 이력에 쌓여도 마지막 의미있는 감정을 찾는다
  const lastMeaningful = (h: EmotionLabel[]): EmotionLabel =>
    [...h].reverse().find(e => e !== 'neutral') ?? 'neutral'

  // ① unclassified → 이전 의미있는 감정 유지, 이력 변경 없음
  if (raw === 'unclassified') {
    const prev = lastMeaningful(history)
    return { resolvedEmotion: prev, fontFamily: getFont(prev), newHistory: history }
  }

  // ② neutral + 이전 이력 있음 → 마지막 의미있는 감정 폰트 유지, 이력에 neutral 기록
  if (raw === 'neutral' && history.length > 0) {
    const prev = lastMeaningful(history)
    const newHistory = [...history, 'neutral'].slice(-3) as EmotionLabel[]
    return { resolvedEmotion: prev, fontFamily: getFont(prev), newHistory }
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
