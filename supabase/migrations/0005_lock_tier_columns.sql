-- 0005: close the monetization / quota bypass.
--
-- Problem: the "profiles update" policy let an authenticated user UPDATE any
-- column of their own row, and the table had a blanket column grant. Since
-- `tier`, `ai_calls_today`, `ai_reset_date` live on `profiles`, a client could
--   update profiles set tier='pro', ai_calls_today=0 where id = auth.uid()
-- → free Pro forever and a self-reset AI quota. The Edge Function enforces the
-- quota server-side, but it trusts `profile.tier`, which the client could flip.
--
-- Fix: add the missing WITH CHECK, drop the blanket UPDATE grant, and re-grant
-- UPDATE only on the safe profile columns. tier/quota columns become writable
-- ONLY by the service role (Edge Functions) — see functions/set-tier.

drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Column-level grants only take effect once the table-level UPDATE is removed.
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name, avatar_url, onboarded)
  on public.profiles to authenticated;

-- service_role keeps its own ALL-privileges grant (used by Edge Functions),
-- so analyze-emotion can still bump ai_calls_today and set-tier can change tier.
