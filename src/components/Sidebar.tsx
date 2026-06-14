import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DiaryMeta } from '../lib/cloudStore'
import SettingsPanel from './SettingsPanel'

const FONT_UI = '"Helvetica Neue", Helvetica, Arial, sans-serif'

const REDS = ['#ff9aa0','#ff6470','#ff3d4a','#fc2b32','#e02228','#c41920','#a81418','#8c1012','#700a0d']

const LOGO: { char: string; size: number; weight: number; color: string }[] = [
  { char: 'T', size: 22, weight: 700, color: REDS[3] },
  { char: 'y', size: 15, weight: 300, color: REDS[1] },
  { char: 'p', size: 19, weight: 500, color: REDS[4] },
  { char: 'i', size: 13, weight: 200, color: REDS[0] },
  { char: 'n', size: 18, weight: 400, color: REDS[5] },
  { char: 'g', size: 23, weight: 700, color: REDS[6] },
  { char: '.', size: 16, weight: 600, color: REDS[3] },
  { char: '.', size: 20, weight: 300, color: REDS[2] },
  { char: '.', size: 13, weight: 800, color: REDS[8] },
]

type Section = 'diary' | 'settings'

interface Props {
  months: string[]
  current: string
  onSelect: (month: string) => void
  onNewMonth: () => void
  diaries?: DiaryMeta[]
  activeDiaryId?: string | null
  onSelectDiary?: (id: string) => void
  onCreateDiary?: (name: string) => void
  onRenameDiary?: (id: string, name: string) => void
  onDeleteDiary?: (id: string) => void
  historyLimit?: number | null   // null = unlimited; N = lock months beyond first N
}

export default function Sidebar({
  months, current, onSelect, onNewMonth,
  diaries = [], activeDiaryId, onSelectDiary,
  onCreateDiary, onRenameDiary, onDeleteDiary,
  historyLimit = null,
}: Props) {
  const navigate = useNavigate()
  const [openSection, setOpenSection] = useState<Section>('diary')
  const [panelOpen, setPanelOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Personal-diary management (create / rename inline).
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const personals = diaries.filter(d => d.kind === 'personal')

  const submitNew = () => {
    const n = newName.trim()
    if (n && onCreateDiary) onCreateDiary(n)
    setNewName(''); setCreating(false)
  }
  const submitRename = (id: string) => {
    const n = editName.trim()
    if (n && onRenameDiary) onRenameDiary(id, n)
    setEditingId(null); setEditName('')
  }

  const handleEnter = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setPanelOpen(true)
  }, [])

  const handleLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setPanelOpen(false), 200)
  }, [])

  const toggle = (s: Section) => setOpenSection(prev => (prev === s ? 'diary' : s))

  return (
    <>
      {/* Top-left open button — clear tap target (esp. mobile) */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          aria-label="메뉴 열기"
          style={{
            position: 'fixed', left: 12, top: 12, zIndex: 98,
            width: 40, height: 40, borderRadius: 10, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fff', color: '#1a1a1a',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.12)', cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="3" y1="5" x2="15" y2="5" />
            <line x1="3" y1="9" x2="15" y2="9" />
            <line x1="3" y1="13" x2="15" y2="13" />
          </svg>
        </button>
      )}

      {/* Mobile backdrop — tap outside to close */}
      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          onTouchStart={() => setPanelOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
        />
      )}

      <div
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onTouchStart={(e) => {
          if (!panelOpen) {
            e.stopPropagation()
            setPanelOpen(true)
          }
        }}
        style={{
          position: 'fixed', left: 0, top: 0,
          height: '100%',
          width: panelOpen ? 190 : 8,
          zIndex: 100,
        }}
      >
        {/* Sliding panel */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: 190, height: '100%',
          background: '#f0ede6',
          borderRight: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', overflowX: 'hidden',
          fontFamily: FONT_UI,
          transform: panelOpen ? 'translateX(0)' : 'translateX(-182px)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: panelOpen ? '3px 0 20px rgba(0,0,0,0.1)' : 'none',
        }}>
          {/* Logo */}
          <div style={{ padding: '22px 18px 16px', lineHeight: 1 }}>
            {LOGO.map((l, i) => (
              <span key={i} style={{
                fontSize: l.size,
                fontWeight: l.weight,
                color: l.color,
                fontFamily: '"Noto Serif KR", Georgia, serif',
              }}>
                {l.char}
              </span>
            ))}
          </div>

          <div style={{ flex: 1 }}>
            {diaries.length > 0 && onSelectDiary && (
              <>
                <GroupLabel>내 일기장</GroupLabel>
                {personals.map(d => (
                  editingId === d.id ? (
                    <input
                      key={d.id}
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitRename(d.id); if (e.key === 'Escape') setEditingId(null) }}
                      onBlur={() => submitRename(d.id)}
                      style={diaryInput}
                    />
                  ) : (
                    <DiaryRow key={d.id} d={d} active={d.id === activeDiaryId}
                      onClick={() => { onSelectDiary(d.id); setPanelOpen(false) }}
                      onRename={onRenameDiary ? () => { setEditingId(d.id); setEditName(d.name) } : undefined}
                      onDelete={onDeleteDiary && personals.length > 1 ? () => {
                        if (window.confirm(`'${d.name}' 일기장과 모든 기록을 삭제할까요?`)) onDeleteDiary(d.id)
                      } : undefined}
                    />
                  )
                ))}
                {onCreateDiary && (
                  creating ? (
                    <input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
                      onBlur={submitNew}
                      placeholder="새 일기장 이름"
                      style={diaryInput}
                    />
                  ) : (
                    <div
                      onClick={() => setCreating(true)}
                      style={{ padding: '6px 22px', fontSize: 11, color: 'rgba(0,0,0,0.3)', cursor: 'pointer', letterSpacing: 0.5 }}
                    >
                      + 새 일기장
                    </div>
                  )
                )}

                <GroupLabel>공유 일기장</GroupLabel>
                {diaries.filter(d => d.kind === 'shared').map(d => (
                  <DiaryRow key={d.id} d={d} active={d.id === activeDiaryId}
                    onClick={() => { onSelectDiary(d.id); setPanelOpen(false) }} />
                ))}
                {diaries.filter(d => d.kind === 'shared').length === 0 && (
                  <div style={{ padding: '4px 22px 6px', fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>아직 없음</div>
                )}

                <div
                  onClick={() => { navigate('/friends'); setPanelOpen(false) }}
                  style={{ padding: '7px 22px', fontSize: 11.5, color: '#fc2b32', cursor: 'pointer', letterSpacing: 0.3 }}
                >
                  친구 · 공유 관리 →
                </div>
              </>
            )}

            <SectionHeader
              label="Months"
              isOpen={openSection === 'diary'}
              onClick={() => toggle('diary')}
            />
            {openSection === 'diary' && (
              <div>
                {months.map((m, idx) => {
                  const locked = historyLimit != null && idx >= historyLimit
                  return (
                    <div
                      key={m}
                      onClick={() => {
                        if (locked) { navigate('/pricing'); return }
                        onSelect(m); setPanelOpen(false)
                      }}
                      title={locked ? 'Pro에서 전체 기록 열람' : undefined}
                      style={{
                        padding: '8px 22px',
                        fontSize: 12,
                        cursor: 'pointer',
                        color: locked ? 'rgba(0,0,0,0.28)' : (m === current ? '#1a1a1a' : 'rgba(0,0,0,0.4)'),
                        fontWeight: m === current ? 600 : 400,
                        background: m === current ? 'rgba(252,43,50,0.06)' : 'transparent',
                        letterSpacing: 0.5,
                        borderLeft: m === current ? '2px solid #fc2b32' : '2px solid transparent',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {m}{locked && <span style={{ fontSize: 10 }}>🔒</span>}
                    </div>
                  )
                })}
                <div
                  onClick={onNewMonth}
                  style={{
                    padding: '8px 22px',
                    fontSize: 11,
                    color: 'rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    letterSpacing: 0.5,
                  }}
                >
                  + 새 달
                </div>
              </div>
            )}

            <SectionHeader
              label="Settings"
              isOpen={openSection === 'settings'}
              onClick={() => toggle('settings')}
            />
            {openSection === 'settings' && (
              <div style={{ padding: '8px 18px 16px' }}>
                <SettingsPanel />
              </div>
            )}
          </div>
        </div>

        {/* Visible strip indicator */}
        <div style={{
          position: 'absolute', right: 0, top: '50%',
          transform: 'translateY(-50%)',
          width: 3, height: 32,
          background: panelOpen ? 'transparent' : 'rgba(0,0,0,0.12)',
          borderRadius: 2,
          transition: 'background 0.22s',
          pointerEvents: 'none',
        }} />
      </div>
    </>
  )
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div style={{
      padding: '10px 18px 4px', fontSize: 10, letterSpacing: 1.5, color: 'rgba(0,0,0,0.35)',
      borderTop: '1px solid rgba(0,0,0,0.06)',
    }}>
      {children}
    </div>
  )
}

const diaryInput: React.CSSProperties = {
  margin: '2px 16px', padding: '5px 7px', width: 'calc(100% - 32px)',
  fontSize: 12, border: '1px solid rgba(252,43,50,0.4)', borderRadius: 5,
  outline: 'none', boxSizing: 'border-box', fontFamily: FONT_UI,
}

function DiaryRow({ d, active, onClick, onRename, onDelete }: {
  d: DiaryMeta; active: boolean; onClick: () => void
  onRename?: () => void; onDelete?: () => void
}) {
  const [hover, setHover] = useState(false)
  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer',
    fontSize: 11, lineHeight: 1, color: 'rgba(0,0,0,0.4)',
  }
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 22px', fontSize: 12, cursor: 'pointer',
        color: active ? '#1a1a1a' : 'rgba(0,0,0,0.45)',
        fontWeight: active ? 600 : 400,
        background: active ? 'rgba(252,43,50,0.06)' : 'transparent',
        borderLeft: active ? '2px solid #fc2b32' : '2px solid transparent',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {d.kind === 'shared' ? '👥' : '📓'} {d.name}
      </span>
      {(hover || active) && onRename && (
        <button title="이름 수정" style={iconBtn}
          onClick={e => { e.stopPropagation(); onRename() }}>✎</button>
      )}
      {(hover || active) && onDelete && (
        <button title="삭제" style={iconBtn}
          onClick={e => { e.stopPropagation(); onDelete() }}>🗑</button>
      )}
    </div>
  )
}

function SectionHeader({
  label, isOpen, onClick,
}: {
  label: string
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 18px',
        fontSize: 10,
        letterSpacing: 1.5,
        color: isOpen ? '#fc2b32' : 'rgba(0,0,0,0.35)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        borderTop: '1px solid rgba(0,0,0,0.06)',
        userSelect: 'none',
        fontWeight: isOpen ? 600 : 400,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}
    >
      <span style={{ fontSize: 8, opacity: 0.7 }}>{isOpen ? '▾' : '▸'}</span>
      {label.toUpperCase()}
    </div>
  )
}
