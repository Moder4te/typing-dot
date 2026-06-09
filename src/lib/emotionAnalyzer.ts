import type { EmotionLabel } from '../types'
import { supabase } from './supabase'
import { logger } from './logger'

const SUPPORTED = new Set<string>([
  'joy', 'delight', 'calm', 'sadness', 'melancholy', 'anxiety', 'anger', 'neutral',
])

// Client-side gate so we don't waste a quota call on trivial input.
export function meetsSignalThreshold(text: string): boolean {
  if (text.replace(/\s/g, '').length < 15) return false
  if (text.trim().split(/\s+/).filter(Boolean).length < 3) return false
  return true
}

interface AnalyzeResponse {
  emotion?: string
  quota?: boolean
  remaining?: number | null
  error?: string
}

// Calls the analyze-emotion Edge Function. The OpenRouter key lives only on the
// server; quota is enforced server-side.
export async function analyzeEmotion(
  text: string,
  onError?: (msg: string) => void,
  force?: boolean
): Promise<EmotionLabel> {
  if (!force && !meetsSignalThreshold(text)) return 'unclassified'

  if (!supabase) {
    onError?.('감정 분석 불가 — 로그인이 필요합니다')
    return 'unclassified'
  }

  try {
    const { data, error } = await supabase.functions.invoke<AnalyzeResponse>('analyze-emotion', {
      body: { text },
    })

    if (error) {
      logger.error('[감정분석] 함수 오류', error)
      onError?.('감정 분석 불가 — 이전 감정 유지')
      return 'unclassified'
    }
    if (data?.quota) {
      onError?.('오늘 무료 AI 분석 횟수를 모두 사용했어요 — Pro로 업그레이드')
      return 'unclassified'
    }
    if (data?.error) {
      logger.warn('[감정분석] 서버 응답 오류:', data.error)
      onError?.('감정 분석 불가 — 이전 감정 유지')
      return 'unclassified'
    }

    const label = String(data?.emotion ?? '').toLowerCase()
    if (!SUPPORTED.has(label)) {
      if (label && label !== 'unclassified') logger.warn(`[typing-dot] unknown emotion: ${label}`)
      return 'unclassified'
    }
    logger.info(`[감정분석] 완료: ${label}${data?.remaining != null ? ` (남은 무료 ${data.remaining})` : ''}`)
    return label as EmotionLabel
  } catch (e) {
    logger.error(`[감정분석] 오류: ${e}`)
    onError?.('감정 분석 불가 — 이전 감정 유지')
    return 'unclassified'
  }
}
