-- Phase 5: shared-diary invites, member listing, realtime.

-- Accept an invite atomically (invitee joins + invite marked accepted).
create or replace function public.accept_diary_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_diary uuid;
begin
  select diary_id into v_diary from public.diary_invites
   where id = p_invite and invitee_id = auth.uid() and status = 'pending';
  if v_diary is null then raise exception 'invite not found'; end if;
  insert into public.diary_members(diary_id, user_id, role)
    values (v_diary, auth.uid(), 'member') on conflict do nothing;
  update public.diary_invites set status = 'accepted' where id = p_invite;
end; $$;
grant execute on function public.accept_diary_invite(uuid) to authenticated;

-- My pending invites, with diary + inviter names (invitee can't read diaries via RLS yet).
create or replace function public.my_diary_invites()
returns table(invite_id uuid, diary_id uuid, diary_name text, inviter_username text)
language sql security definer set search_path = public as $$
  select i.id, i.diary_id, d.name, p.username
  from public.diary_invites i
  join public.diaries d on d.id = i.diary_id
  join public.profiles p on p.id = i.inviter_id
  where i.invitee_id = auth.uid() and i.status = 'pending';
$$;
grant execute on function public.my_diary_invites() to authenticated;

-- Members of a diary (owner + members), with usernames. Caller must be a member.
create or replace function public.diary_members_list(p_diary uuid)
returns table(user_id uuid, username text, role text)
language sql security definer set search_path = public as $$
  select m.user_id, p.username, m.role
  from public.diary_members m join public.profiles p on p.id = m.user_id
  where m.diary_id = p_diary and public.is_diary_member(p_diary)
  union
  select d.owner_id, p.username, 'owner'
  from public.diaries d join public.profiles p on p.id = d.owner_id
  where d.id = p_diary and public.is_diary_member(p_diary);
$$;
grant execute on function public.diary_members_list(uuid) to authenticated;

-- Tighten: only the owner inserts members directly; invitees join via the RPC above.
drop policy if exists "members insert" on public.diary_members;
create policy "members insert" on public.diary_members for insert to authenticated
  with check (exists (select 1 from public.diaries d where d.id = diary_id and d.owner_id = auth.uid()));

-- Enable realtime on blocks for live shared-diary sync.
do $$ begin
  alter publication supabase_realtime add table public.blocks;
exception when duplicate_object then null; end $$;
