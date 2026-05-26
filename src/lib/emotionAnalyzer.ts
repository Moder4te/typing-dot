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
    return SUPPORTED.has(label) ? (label as EmotionLabel) : 'unclassified'
  } catch {
    return 'unclassified'
  }
}

async function callClaude(text: string, key: string): Promise<EmotionLabel> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}`)
  const data = await res.json()
  return parseEmotion(data.content[0].text)
}

async function callGemini(text: string, key: string): Promise<EmotionLabel> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nText: ${text}` }] }],
      generationConfig: { maxOutputTokens: 32 },
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  return parseEmotion(data.candidates[0].content.parts[0].text)
}

export async function analyzeEmotion(
  text: string,
  settings: AppSettings,
  onError?: (msg: string) => void
): Promise<EmotionLabel> {
  if (!meetsSignalThreshold(text)) return 'unclassified'

  const { provider, claudeApiKey, geminiApiKey } = settings
  const primary = provider === 'claude'
    ? { fn: callClaude, key: claudeApiKey, name: 'Claude' }
    : { fn: callGemini, key: geminiApiKey, name: 'Gemini' }
  const fallback = provider === 'claude'
    ? { fn: callGemini, key: geminiApiKey, name: 'Gemini' }
    : { fn: callClaude, key: claudeApiKey, name: 'Claude' }

  if (!primary.key) {
    onError?.('감정 분석 불가 — API 키를 설정해 주세요')
    return 'unclassified'
  }

  try {
    return await primary.fn(text, primary.key)
  } catch {
    if (fallback.key) {
      try {
        return await fallback.fn(text, fallback.key)
      } catch {
        // both failed
      }
    }
    onError?.('감정 분석 불가 — 이전 감정 유지')
    return 'unclassified'
  }
}
