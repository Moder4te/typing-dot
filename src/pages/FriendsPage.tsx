import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { listDiaries, type DiaryMeta } from '../lib/cloudStore'
import {
  searchUsers, sendFriendRequest, listFriends, listIncomingRequests,
  acceptFriend, removeFriend, createSharedDiary, inviteToDiary,
  listInvites, acceptInvite, declineInvite,
  type UserLite, type FriendRow, type RequestRow, type InviteRow,
} from '../lib/social'

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 18 }}>
      <h2 style={{ fontSize: 12, letterSpacing: 1, color: 'rgba(0,0,0,0.5)', fontWeight: 600, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  )
}

const pill: React.CSSProperties = {
  padding: '5px 11px', fontSize: 12, fontWeight: 600, background: '#fc2b32', color: '#fff',
  border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
}
const ghost: React.CSSProperties = {
  padding: '5px 11px', fontSize: 12, background: 'transparent', color: 'rgba(0,0,0,0.55)',
  border: '1px solid rgba(0,0,0,0.15)', borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
}
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
  borderTop: '1px solid rgba(0,0,0,0.05)',
}

export default function FriendsPage() {
  const { user } = useAuth()
  const myId = user?.id ?? ''

  const [friends, setFriends] = useState<FriendRow[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [shared, setShared] = useState<DiaryMeta[]>([])
  const [q, setQ] = useState('')
  const [results, setResults] = useState<UserLite[]>([])
  const [newDiary, setNewDiary] = useState('')
  const [msg, setMsg] = useState('')

  const refresh = useCallback(async () => {
    if (!myId) return
    const [f, r, i, ds] = await Promise.all([
      listFriends(myId), listIncomingRequests(myId), listInvites(), listDiaries(),
    ])
    setFriends(f); setRequests(r); setInvites(i)
    setShared(ds.filter(d => d.kind === 'shared'))
  }, [myId])

  useEffect(() => {
    void (async () => {
      try { await refresh() } catch (e) { setMsg(String(e)) }
    })()
  }, [refresh])

  const doSearch = async (v: string) => {
    setQ(v)
    if (!v.trim()) { setResults([]); return }
    try { setResults(await searchUsers(v, myId)) } catch { /* ignore */ }
  }

  const add = async (id: string) => {
    try {
      await sendFriendRequest(myId, id)
      setMsg('친구 요청을 보냈습니다.'); setResults([]); setQ('')
    } catch (e) {
      const m = String((e as { message?: string })?.message ?? e)
      setMsg(m.includes('duplicate') ? '이미 요청했거나 친구입니다.' : `요청 실패: ${m}`)
    }
  }

  const wrap = (fn: () => Promise<void>) => async () => {
    try { await fn(); await refresh() } catch (e) { setMsg(String(e)) }
  }

  const makeDiary = async () => {
    if (!newDiary.trim()) { setMsg('일기장 이름을 입력하세요.'); return }
    try {
      await createSharedDiary(newDiary.trim())
      setNewDiary(''); setMsg('공유 일기장을 만들었습니다.')
      await refresh()
    } catch (e) {
      setMsg(`생성 실패: ${String((e as { message?: string })?.message ?? e)}`)
    }
  }

  const invite = async (diaryId: string, friendId: string) => {
    try { await inviteToDiary(diaryId, friendId); setMsg('초대를 보냈습니다.') }
    catch (e) {
      const m = String((e as { message?: string })?.message ?? e)
      setMsg(m.includes('duplicate') ? '이미 초대했거나 멤버입니다.' : `초대 실패: ${m}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: FONT, color: '#1a1a1a' }}>
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>친구 · 공유 일기장</h1>
          <Link to="/" style={{ fontSize: 12, color: '#fc2b32' }}>← 캔버스로</Link>
        </div>
        {msg && <div style={{ fontSize: 12, color: '#fc2b32' }}>{msg}</div>}

        <Section title="친구 찾기">
          <input
            value={q} onChange={e => doSearch(e.target.value)} placeholder="아이디로 검색"
            style={{ width: '100%', padding: '9px 11px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 6, outline: 'none', boxSizing: 'border-box', fontFamily: FONT }}
          />
          {results.map(u => (
            <div key={u.id} style={row}>
              <span style={{ flex: 1, fontSize: 13 }}>@{u.username}</span>
              <button style={pill} onClick={() => add(u.id)}>친구 추가</button>
            </div>
          ))}
        </Section>

        {requests.length > 0 && (
          <Section title={`받은 친구 요청 (${requests.length})`}>
            {requests.map(r => (
              <div key={r.id} style={row}>
                <span style={{ flex: 1, fontSize: 13 }}>@{r.from.username}</span>
                <button style={pill} onClick={wrap(() => acceptFriend(r.id))}>수락</button>
                <button style={ghost} onClick={wrap(() => removeFriend(r.id))}>거절</button>
              </div>
            ))}
          </Section>
        )}

        <Section title={`친구 (${friends.length})`}>
          {friends.length === 0 && <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>아직 친구가 없습니다.</p>}
          {friends.map(f => (
            <div key={f.id} style={row}>
              <span style={{ flex: 1, fontSize: 13 }}>@{f.friend.username}</span>
              {shared.length > 0 && (
                <select
                  defaultValue=""
                  onChange={e => { if (e.target.value) { invite(e.target.value, f.friend.id); e.target.value = '' } }}
                  style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', fontFamily: FONT }}
                >
                  <option value="">초대 →</option>
                  {shared.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <button style={ghost} onClick={wrap(() => removeFriend(f.id))}>삭제</button>
            </div>
          ))}
        </Section>

        {invites.length > 0 && (
          <Section title={`받은 일기장 초대 (${invites.length})`}>
            {invites.map(i => (
              <div key={i.invite_id} style={row}>
                <span style={{ flex: 1, fontSize: 13 }}>{i.diary_name} <span style={{ color: 'rgba(0,0,0,0.4)' }}>· @{i.inviter_username}</span></span>
                <button style={pill} onClick={wrap(() => acceptInvite(i.invite_id))}>참여</button>
                <button style={ghost} onClick={wrap(() => declineInvite(i.invite_id))}>거절</button>
              </div>
            ))}
          </Section>
        )}

        <Section title="공유 일기장">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={newDiary} onChange={e => setNewDiary(e.target.value)} placeholder="새 공유 일기장 이름"
              style={{ flex: 1, padding: '9px 11px', fontSize: 14, border: '1px solid rgba(0,0,0,0.14)', borderRadius: 6, outline: 'none', fontFamily: FONT }}
            />
            <button style={pill} onClick={makeDiary}>만들기</button>
          </div>
          {shared.map(d => (
            <div key={d.id} style={row}>
              <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
              <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>{d.owner_id === myId ? '내 일기장' : '참여 중'}</span>
            </div>
          ))}
          {shared.length === 0 && <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)' }}>공유 일기장을 만들고 친구를 초대해 보세요.</p>}
        </Section>
      </div>
    </div>
  )
}
