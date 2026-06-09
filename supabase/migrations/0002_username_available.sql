-- Lets a not-yet-authenticated signup form check username availability.
-- SECURITY DEFINER bypasses RLS for this single boolean check only.
create or replace function public.username_available(name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;

grant execute on function public.username_available(text) to anon, authenticated;
