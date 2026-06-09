-- Ensure authenticated users can create their own diaries (shared diaries).
-- Personal diaries are made by the signup trigger (SECURITY DEFINER, bypasses RLS),
-- so a missing/!broken insert policy only shows up when creating shared diaries.

drop policy if exists "diaries insert" on public.diaries;
create policy "diaries insert" on public.diaries
  for insert to authenticated
  with check (owner_id = auth.uid());

-- Default owner_id to the caller so an omitted/incorrect value can't break the check.
alter table public.diaries alter column owner_id set default auth.uid();
