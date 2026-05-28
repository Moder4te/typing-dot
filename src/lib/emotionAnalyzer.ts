import type { EmotionLabel, AppSettings } from '../types'

const SUPPORTED = new Set<string>([
  'joy', 'sadness', 'anger', 'fear', 'calm', 'surprise', 'neutral',
])

const SYSTEM_PROMPT =
  'You are an emotion classifier. Analyze the emotional tone of the given text. ' +
  'Respond with ONLY a JSON object: {"emotion":"<label>"}. ' +
  'Valid labels: joy, sadness, anger, fear, calm, surprise, neutral. ' +
  'Choose the single most dominant emotion. If truly ambiguous, use neutral.'

export function meetsSignalThreshold(text: string): boolean {
  if (text.replace(/\s/g, '').length < 15) return false
  if (text.trim().split(/\s+/).filter(Boolean).length < 3) return false
  return true
}

function parseEmotion(raw: string): EmotionLabel {
  try {
    const match = raw.match(/\{[^}]+\}/)
    if (!match) return 'unclassified'
    const obj = JSON.parse(match[0])
    const label = String(obj.emotion ?? '').toLowerCase()
    if (!SUPPORTED.has(label)) {
      console.warn(`[typing-dot] unknown emotion: ${label}`)
      return 'unclassified'
    }
    return label as EmotionLabel
  } catch {
    return 'unclassified'
  }
}

async function callOpenRouter(text: string, key: string): Promise<EmotionLabel> {
  console.info(`[API] OpenRouter 요청 → "${text.slice(0, 30)}..."`)
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      max_tokens: 32,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    console.error(`[API] OpenRouter 실패: HTTP ${res.status}`)
    throw new Error(`OpenRouter ${res.status}`)
  }
  const data = await res.json()
  const raw = data.choices[0].message.content
  const emotion = parseEmotion(raw)
  console.info(`[API] OpenRouter 응답: "${raw}" → 감정: ${emotion}`)
  return emotion
}

export async function analyzeEmotion(
  text: string,
  settings: AppSettings,
  onError?: (msg: string) => void,
  force?: boolean
): Promise<EmotionLabel> {
  if (!force && !meetsSignalThreshold(text)) {
    console.log(`[감정분석] 임계값 미달 (글자수: ${text.replace(/\s/g, '').length})`)
    return 'unclassified'
  }

  const { openrouterApiKey } = settings

  if (!openrouterApiKey) {
    console.warn('[감정분석] API 키 없음')
    onError?.('감정 분석 불가 — OpenRouter API 키를 설정해 주세요')
    return 'unclassified'
  }

  console.log(`[감정분석] 분석 시작 (${text.replace(/\s/g, '').length}자)`)
  try {
    const result = await callOpenRouter(text, openrouterApiKey)
    console.info(`[감정분석] 완료: ${result}`)
    return result
  } catch (e) {
    console.error(`[감정분석] 오류: ${e}`)
    onError?.('감정 분석 불가 — 이전 감정 유지')
    return 'unclassified'
  }
}
