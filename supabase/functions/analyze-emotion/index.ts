// Supabase Edge Function: server-side emotion analysis proxy.
// - Keeps the OpenRouter key OUT of the browser (set via `supabase secrets set OPENROUTER_API_KEY=...`).
// - Enforces the free-tier daily quota server-side (clients can't bypass it).
// Deploy: supabase functions deploy analyze-emotion
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FREE_AI_DAILY = 20 // keep in sync with src/lib/entitlements.ts
const MODEL = 'openai/gpt-4o-mini'
const SUPPORTED = new Set(['joy', 'delight', 'calm', 'sadness', 'melancholy', 'anxiety', 'anger', 'neutral'])

const SYSTEM_PROMPT =
  'You are an emotion classifier for Korean or English text. Analyze the emotional tone. ' +
  'Respond with ONLY a JSON object: {"emotion":"<label>"}. ' +
  'Valid labels and meaning: ' +
  'joy (기쁨, happiness/gladness), delight (즐거움, fun/excitement/playful), ' +
  'calm (평온, peaceful/relaxed), sadness (슬픔, sorrow/tears), ' +
  'melancholy (우울, gloom/depression/heaviness), anxiety (불안, nervous/urgent/restless), ' +
  'anger (분노, rage/irritation), neutral (중립, no strong emotion). ' +
  'Choose the single most dominant emotion. If truly ambiguous, use neutral.'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function parseEmotion(raw: string): string {
  try {
    const m = raw.match(/\{[^}]+\}/)
    if (!m) return 'unclassified'
    const label = String(JSON.parse(m[0]).emotion ?? '').toLowerCase()
    return SUPPORTED.has(label) ? label : 'unclassified'
  } catch {
    return 'unclassified'
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!jwt) return json({ emotion: 'unclassified', error: 'unauthorized' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData.user) return json({ emotion: 'unclassified', error: 'unauthorized' }, 401)
    const uid = userData.user.id

    const { text } = await req.json().catch(() => ({ text: '' }))
    if (!text || typeof text !== 'string') return json({ emotion: 'unclassified', error: 'no text' })

    // Load tier + quota.
    const { data: profile } = await admin
      .from('profiles').select('tier, ai_calls_today, ai_reset_date').eq('id', uid).single()
    if (!profile) return json({ emotion: 'unclassified', error: 'no profile' })

    const t = today()
    let used = profile.ai_reset_date === t ? (profile.ai_calls_today ?? 0) : 0

    if (profile.tier !== 'pro' && used >= FREE_AI_DAILY) {
      return json({ emotion: 'unclassified', quota: true, remaining: 0 })
    }

    // Call OpenRouter.
    const key = Deno.env.get('OPENROUTER_API_KEY')
    if (!key) return json({ emotion: 'unclassified', error: 'server misconfigured' })

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 32,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.slice(0, 2000) },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return json({ emotion: 'unclassified', error: `openrouter ${res.status}` })

    const data = await res.json()
    const emotion = parseEmotion(data.choices?.[0]?.message?.content ?? '')

    // Count the successful call (free tier only needs tracking, but track all).
    used += 1
    await admin.from('profiles').update({ ai_calls_today: used, ai_reset_date: t }).eq('id', uid)

    const remaining = profile.tier === 'pro' ? null : Math.max(0, FREE_AI_DAILY - used)
    return json({ emotion, remaining })
  } catch (e) {
    return json({ emotion: 'unclassified', error: String(e) })
  }
})
