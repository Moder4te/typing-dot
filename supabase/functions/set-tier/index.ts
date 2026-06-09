// Supabase Edge Function: tier change (mock checkout).
//
// `profiles.tier` is locked from direct client writes (migration 0005), so a
// tier change MUST go through a privileged path. This function is that single
// chokepoint: it runs with the service role and sets the caller's tier.
//
// ⚠️ MOCK: it currently grants the requested tier with no payment. This is the
// exact place to plug in real billing — verify a Stripe Checkout session /
// listen to the webhook before granting 'pro'. Until then it mirrors the old
// mock behaviour, but the privilege now lives on the server, not the browser.
//
// Deploy: supabase functions deploy set-tier
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!jwt) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401)
    const uid = userData.user.id

    const { tier } = await req.json().catch(() => ({ tier: '' }))
    if (tier !== 'free' && tier !== 'pro') return json({ error: 'invalid tier' }, 400)

    // TODO(billing): before granting 'pro', verify a real payment
    // (Stripe Checkout session / webhook). This MOCK grants it unconditionally.

    const { error: upErr } = await admin.from('profiles').update({ tier }).eq('id', uid)
    if (upErr) return json({ error: upErr.message }, 500)

    await admin.from('subscriptions').upsert({
      user_id: uid, tier, status: 'active', provider: 'mock', is_mock: true,
      updated_at: new Date().toISOString(),
    })

    return json({ ok: true, tier })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
