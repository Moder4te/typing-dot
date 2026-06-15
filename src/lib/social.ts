import { supabase } from './supabase'

export interface UserLite { id: string; username: string; display_name: string | null }
export interface FriendRow { id: string; friend: UserLite; status: string }
export interface RequestRow { id: string; from: UserLite }
export interface InviteRow { invite_id: string; diary_id: string; diary_name: string; inviter_username: string }
export interface MemberRow { user_id: string; username: string; role: string }

function db() {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

// ── users ───────────────────────────────────────────────────
export async function searchUsers(q: string, excludeId: string): Promise<UserLite[]> {
  if (!q.trim()) return []
  const { data, error } = await db()
    .from('profiles').select('id, username, display_name')
    .ilike('username', `%${q.trim()}%`).neq('id', excludeId).limit(10)
  if (error) throw error
  return (data ?? []) as UserLite[]
}

// ── friendships ─────────────────────────────────────────────
export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const { error } = await db().from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
  if (error) throw error
}

export async function listFriends(myId: string): Promise<FriendRow[]> {
  const { data, error } = await db()
    .from('friendships')
    .select('id, status, requester_id, addressee_id, requester:profiles!requester_id(id,username,display_name), addressee:profiles!addressee_id(id,username,display_name)')
    .eq('status', 'accepted')
  if (error) throw error
  type Row = {
    id: string; status: string; requester_id: string
    requester: UserLite; addressee: UserLite
  }
  return (data as unknown as Row[]).map(r => ({
    id: r.id, status: r.status,
    friend: r.requester_id === myId ? r.addressee : r.requester,
  }))
}

export async function listIncomingRequests(myId: string): Promise<RequestRow[]> {
  const { data, error } = await db()
    .from('friendships')
    .select('id, requester:profiles!requester_id(id,username,display_name)')
    .eq('status', 'pending').eq('addressee_id', myId)
  if (error) throw error
  type Row = { id: string; requester: UserLite }
  return (data as unknown as Row[]).map(r => ({ id: r.id, from: r.requester }))
}

export async function acceptFriend(id: string): Promise<void> {
  const { error } = await db().from('friendships').update({ status: 'accepted' }).eq('id', id)
  if (error) throw error
}

export async function removeFriend(id: string): Promise<void> {
  const { error } = await db().from('friendships').delete().eq('id', id)
  if (error) throw error
}

// ── shared diaries ──────────────────────────────────────────
export async function createSharedDiary(name: string): Promise<string> {
  const sb = db()
  const { data: s } = await sb.auth.getSession()
  if (!s.session) throw new Error('로그인 세션이 없습니다 — 다시 로그인하세요')
  // Generate the id client-side and DON'T use .select(): an INSERT...RETURNING
  // would run the diaries SELECT policy (is_diary_member, self-referential) against
  // a row not yet visible in the statement snapshot → false → 403. owner_id is
  // omitted so it defaults to auth.uid() (migration 0004).
  const id = crypto.randomUUID()
  const { error } = await sb.from('diaries').insert({ id, name, kind: 'shared' })
  if (error) throw error
  return id
}

export async function inviteToDiary(diaryId: string, inviteeId: string): Promise<void> {
  const sb = db()
  const { data: u } = await sb.auth.getUser()
  if (!u.user) throw new Error('로그인 세션이 없습니다 — 다시 로그인하세요')
  const { error } = await sb.from('diary_invites')
    .insert({ diary_id: diaryId, invitee_id: inviteeId, inviter_id: u.user.id })
  if (error) throw error
}

export async function listInvites(): Promise<InviteRow[]> {
  const { data, error } = await db().rpc('my_diary_invites')
  if (error) throw error
  return (data ?? []) as InviteRow[]
}

export async function acceptInvite(inviteId: string): Promise<void> {
  const { error } = await db().rpc('accept_diary_invite', { p_invite: inviteId })
  if (error) throw error
}

export async function declineInvite(inviteId: string): Promise<void> {
  const { error } = await db().from('diary_invites').update({ status: 'declined' }).eq('id', inviteId)
  if (error) throw error
}

// Leave a shared diary — removes the caller's own membership row. RLS allows a
// member to delete their own row (user_id = auth.uid()).
export async function leaveDiary(diaryId: string, userId: string): Promise<void> {
  const { error } = await db().from('diary_members').delete()
    .eq('diary_id', diaryId).eq('user_id', userId)
  if (error) throw error
}

export async function diaryMembers(diaryId: string): Promise<MemberRow[]> {
  const { data, error } = await db().rpc('diary_members_list', { p_diary: diaryId })
  if (error) throw error
  return (data ?? []) as MemberRow[]
}
