-- typing-dot initial schema (Phase 1 deliverable; tables consumed in Phases 2-6)
-- Run in Supabase: SQL Editor → paste → Run, or `supabase db push`.

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  tier          text not null default 'free' check (tier in ('free','pro')),
  ai_calls_today int not null default 0,
  ai_reset_date date not null default current_date,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ── diaries (personal + shared) ─────────────────────────────
create table if not exists public.diaries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null default 'My Diary',
  kind       text not null default 'personal' check (kind in ('personal','shared')),
  created_at timestamptz not null default now()
);

create table if not exists public.diary_members (
  diary_id  uuid not null references public.diaries(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (diary_id, user_id)
);

-- ── blocks (one text block on the canvas) ───────────────────
create table if not exists public.blocks (
  id          uuid primary key default gen_random_uuid(),
  diary_id    uuid not null references public.diaries(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  year_month  text not null,
  x           double precision not null,
  y           double precision not null,
  text        text not null default '',
  strokes     jsonb not null default '[]'::jsonb,
  char_styles jsonb not null default '[]'::jsonb,  -- per-character typography (fixes persistence bug)
  emotion     text not null default 'unclassified',
  font_family text not null default 'Noto Serif KR',
  font_size   double precision not null default 1.0,
  font_weight int not null default 400,
  is_italic   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists blocks_diary_month_idx on public.blocks(diary_id, year_month);

-- ── friendships ─────────────────────────────────────────────
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at   timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

-- ── diary invites ───────────────────────────────────────────
create table if not exists public.diary_invites (
  id         uuid primary key default gen_random_uuid(),
  diary_id   uuid not null references public.diaries(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (diary_id, invitee_id)
);

-- ── subscriptions (mock now, Stripe later) ──────────────────
create table if not exists public.subscriptions (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  tier       text not null default 'free' check (tier in ('free','pro')),
  status     text not null default 'active',
  period_end timestamptz,
  provider   text not null default 'mock',
  is_mock    boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ── auto-create profile on signup ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username')
  );
  insert into public.diaries (owner_id, name, kind) values (new.id, 'My Diary', 'personal');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── helper: is the current user a member of a diary? ────────
create or replace function public.is_diary_member(d uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.diaries di where di.id = d and di.owner_id = auth.uid()
    union
    select 1 from public.diary_members dm where dm.diary_id = d and dm.user_id = auth.uid()
  );
$$;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.diaries       enable row level security;
alter table public.diary_members enable row level security;
alter table public.blocks        enable row level security;
alter table public.friendships   enable row level security;
alter table public.diary_invites enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: anyone authed can read (for friend search); only self can edit own
create policy "profiles read"   on public.profiles for select to authenticated using (true);
create policy "profiles update" on public.profiles for update to authenticated using (id = auth.uid());

-- diaries: member can read; owner can write
create policy "diaries read"   on public.diaries for select to authenticated using (public.is_diary_member(id));
create policy "diaries insert" on public.diaries for insert to authenticated with check (owner_id = auth.uid());
create policy "diaries update" on public.diaries for update to authenticated using (owner_id = auth.uid());
create policy "diaries delete" on public.diaries for delete to authenticated using (owner_id = auth.uid());

-- diary_members: members can read; owner manages
create policy "members read"   on public.diary_members for select to authenticated using (public.is_diary_member(diary_id));
create policy "members insert" on public.diary_members for insert to authenticated
  with check (exists (select 1 from public.diaries d where d.id = diary_id and d.owner_id = auth.uid()) or user_id = auth.uid());
create policy "members delete" on public.diary_members for delete to authenticated
  using (exists (select 1 from public.diaries d where d.id = diary_id and d.owner_id = auth.uid()) or user_id = auth.uid());

-- blocks: any diary member can read/write
create policy "blocks read"   on public.blocks for select to authenticated using (public.is_diary_member(diary_id));
create policy "blocks insert" on public.blocks for insert to authenticated with check (public.is_diary_member(diary_id) and author_id = auth.uid());
create policy "blocks update" on public.blocks for update to authenticated using (public.is_diary_member(diary_id));
create policy "blocks delete" on public.blocks for delete to authenticated using (public.is_diary_member(diary_id));

-- friendships: only the two parties can see/manage
create policy "friend read"   on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friend insert" on public.friendships for insert to authenticated with check (requester_id = auth.uid());
create policy "friend update" on public.friendships for update to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friend delete" on public.friendships for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

-- diary_invites: inviter or invitee can see; inviter creates; invitee responds
create policy "invite read"   on public.diary_invites for select to authenticated using (inviter_id = auth.uid() or invitee_id = auth.uid());
create policy "invite insert" on public.diary_invites for insert to authenticated with check (inviter_id = auth.uid());
create policy "invite update" on public.diary_invites for update to authenticated using (inviter_id = auth.uid() or invitee_id = auth.uid());

-- subscriptions: only self can read; writes go through service role / edge fn
create policy "subs read" on public.subscriptions for select to authenticated using (user_id = auth.uid());
