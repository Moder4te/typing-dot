import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DiaryMeta } from '../lib/cloudStore'
import { groupByMonth, formatMonthLabel, formatDateLabel } from '../lib/storage'
import SettingsPanel from './SettingsPanel'
import AccountMenu from './AccountMenu'
import { useConfirm } from './ConfirmDialog'

const FONT_UI = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const ACCENT = '#fc2b32'

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
  onRemoveShared?: (id: string) => void   // owner → delete, member → leave
  currentUserId?: string
  historyLimit?: number | null   // null = unlimited; N = lock months beyond first N
  // Bottom toolbar — moved here from the floating canvas controls.
  textColor?: string
  exportEnabled?: boolean
  onOpenPalette?: () => void
  onShare?: () => void
}

export default function Sidebar({
  months, current, onSelect, onNewMonth,
  diaries = [], activeDiaryId, onSelectDiary,
  onCreateDiary, onRenameDiary, onDeleteDiary,
  onRemoveShared, currentUserId,
  historyLimit = null,
  textColor = '#1a1a1a', exportEnabled = false, onOpenPalette, onShare,
}: Props) {
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()
  const [openSection, setOpenSection] = useState<Section>('diary')
  const [panelOpen, setPanelOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Personal-diary management (create / rename inline).
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({})

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

  // Date tree — the active diary's day entries, grouped by month (year/month → date).
  const renderDateTree = () => {
    const grouped = groupByMonth(months)
    const monthKeys = Object.keys(grouped).sort().reverse()
    const curMonth = current.slice(0, 7)
    return (
      <div>
        {monthKeys.map((mk, idx) => {
          const locked = historyLimit != null && idx >= historyLimit
          const isOpen = openMonths[mk] ?? (mk === curMonth)
          const dates = grouped[mk]
          return (
            <div key={mk}>
              <div
                onClick={() => {
                  if (locked) { navigate('/pricing'); return }
                  setOpenMonths(p => ({ ...p, [mk]: !isOpen }))
                }}
                title={locked ? 'Unlock full history with Pro' : undefined}
                style={{
                  padding: '8px 22px', fontSize: 12, cursor: 'pointer',
                  color: locked ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.6)',
                  fontWeight: 600, letterSpacing: 0.3,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ width: 9, fontSize: 8, opacity: 0.55, flexShrink: 0 }}>{isOpen ? '▼' : '▶'}</span>
                <span style={{ flex: 1 }}>{formatMonthLabel(mk)}</span>
                <span style={{ fontSize: 10, opacity: 0.4 }}>({dates.length})</span>
                {locked && <span style={{ fontSize: 10 }}>🔒</span>}
              </div>
              {isOpen && !locked && dates.map(dk => {
                const isCur = dk === current
                return (
                  <div
                    key={dk}
                    onClick={() => { onSelect(dk); setPanelOpen(false) }}
                    style={{
                      padding: '6px 22px 6px 40px', fontSize: 12, cursor: 'pointer',
                      color: isCur ? '#1a1a1a' : 'rgba(0,0,0,0.4)',
                      fontWeight: isCur ? 600 : 400,
                      background: isCur ? 'rgba(252,43,50,0.06)' : 'transparent',
                      borderLeft: isCur ? '2px solid #fc2b32' : '2px solid transparent',
                      letterSpacing: 0.5,
                    }}
                  >
                    {formatDateLabel(dk)}
                  </div>
                )
              })}
            </div>
          )
        })}
        <div
          onClick={onNewMonth}
          style={{ padding: '8px 22px', fontSize: 11, color: ACCENT, cursor: 'pointer', letterSpacing: 0.5 }}
        >
          + today
        </div>
      </div>
    )
  }

  // Notebook switcher — personal diaries plus shared ones (marked with 👥).
  // Separate from the date diary above; create new notebooks here.
  const renderDiaries = () => (
    <div>
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
            onClick={() => { onSelectDiary?.(d.id); setPanelOpen(false) }}
            onRename={onRenameDiary ? () => { setEditingId(d.id); setEditName(d.name) } : undefined}
            onDelete={onDeleteDiary && personals.length > 1 ? async () => {
              if (await confirm({
                title: 'Delete diary',
                message: `“${d.name}” and all its entries will be permanently deleted.`,
                confirmLabel: 'Delete',
              })) onDeleteDiary(d.id)
            } : undefined}
          />
        )
      ))}
      {diaries.filter(d => d.kind === 'shared').map(d => {
        const owner = d.owner_id === currentUserId
        return (
          <DiaryRow key={d.id} d={d} active={d.id === activeDiaryId}
            onClick={() => { onSelectDiary?.(d.id); setPanelOpen(false) }}
            onDelete={onRemoveShared ? async () => {
              const ok = await confirm(owner
                ? { title: 'Delete shared diary', message: `“${d.name}” will be removed for everyone, including all its entries.`, confirmLabel: 'Delete' }
                : { title: 'Leave shared diary', message: `You’ll lose access to “${d.name}”. You can be re-invited later.`, confirmLabel: 'Leave' })
              if (ok) onRemoveShared(d.id)
            } : undefined}
          />
        )
      })}
      {onCreateDiary && (
        creating ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitNew(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
            onBlur={submitNew}
            placeholder="New diary name"
            style={diaryInput}
          />
        ) : (
          <div
            onClick={() => setCreating(true)}
            style={{ padding: '7px 22px', fontSize: 11, color: 'rgba(0,0,0,0.3)', cursor: 'pointer', letterSpacing: 0.5 }}
          >
            + new
          </div>
        )
      )}
    </div>
  )

  return (
    <>
      {/* Top-left open button — clear tap target (esp. mobile) */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          aria-label="Open menu"
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

      {/* Always-visible brand red edge — stays even when the sidebar is tucked away.
          When the panel is open it lines up with the panel's own left border. */}
      <div style={{
        position: 'fixed', left: 0, top: 0, height: '100%', width: 6,
        background: ACCENT, zIndex: 101, pointerEvents: 'none',
      }} />

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
          background: '#ffffff',
          borderLeft: `6px solid ${ACCENT}`,
          borderRight: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', overflowX: 'hidden',
          fontFamily: FONT_UI,
          transform: panelOpen ? 'translateX(0)' : 'translateX(-182px)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: panelOpen ? '3px 0 20px rgba(0,0,0,0.1)' : 'none',
        }}>
          {/* Logo (ported brand wordmark image) */}
          <div style={{ padding: '20px 14px 12px 16px' }}>
            <img
              src="/typing-logo.png"
              alt="Typing..."
              style={{
                width: 150,
                height: 'auto',
                display: 'block',
                mixBlendMode: 'multiply',
                filter: 'contrast(1.12) saturate(1.12)',
                transform: 'rotate(-1deg)',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            {/* Date diary — the active notebook's day entries, by month */}
            <GroupLabel>Diary</GroupLabel>
            {renderDateTree()}

            {/* My Diary — notebook switcher (shared notebooks marked 👥) */}
            {diaries.length > 0 && onSelectDiary && (
              <>
                <GroupLabel>My Diary</GroupLabel>
                {renderDiaries()}
                <div
                  onClick={() => { navigate('/friends'); setPanelOpen(false) }}
                  style={{
                    padding: '9px 22px', fontSize: 11.5, color: ACCENT, cursor: 'pointer',
                    letterSpacing: 0.3, borderTop: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  Follower →
                </div>
              </>
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

            {/* Color + share toolbar — moved here from the floating canvas controls */}
            {(onOpenPalette || onShare) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 18px', borderTop: '1px solid rgba(0,0,0,0.06)',
              }}>
                {onOpenPalette && (
                  <button
                    onClick={() => { onOpenPalette(); setPanelOpen(false) }}
                    title="Text color · quick palette"
                    aria-label="Text color"
                    style={{
                      width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', padding: 3,
                      border: 'none', flexShrink: 0,
                      background: 'conic-gradient(red, magenta, blue, cyan, lime, yellow, red)',
                      boxShadow: '0 1px 5px rgba(0,0,0,0.2)',
                    }}
                  >
                    {/* Inner disc shows the current color; the rainbow ring is the RGB wheel */}
                    <span style={{
                      display: 'block', width: '100%', height: '100%', borderRadius: '50%',
                      background: textColor, border: '2px solid #fff', boxSizing: 'border-box',
                    }} />
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={() => { onShare(); setPanelOpen(false) }}
                    title={exportEnabled ? 'Share as image' : 'Pro only — share as image'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 11px', fontSize: 12, fontWeight: 600, fontFamily: FONT_UI,
                      background: 'transparent', color: '#1a1a1a',
                      border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7, cursor: 'pointer',
                    }}
                  >
                    📷 Share{!exportEnabled && <span style={{ fontSize: 10, opacity: 0.6 }}>🔒</span>}
                  </button>
                )}
              </div>
            )}

            <a
              href="/presentation.html"
              target="_blank"
              rel="noopener"
              onClick={() => setPanelOpen(false)}
              style={{
                display: 'block', padding: '11px 18px', fontSize: 11.5,
                color: 'rgba(0,0,0,0.45)', textDecoration: 'none', letterSpacing: 0.3,
                borderTop: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              📖 Guide
            </a>

            {/* Account — integrated from the former top-right floating menu */}
            <AccountMenu />
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

      {dialog}
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

function DiaryRow({ d, active, expanded, onClick, onRename, onDelete }: {
  d: DiaryMeta; active: boolean; expanded?: boolean; onClick: () => void
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
      {expanded !== undefined && (
        <span style={{ width: 9, fontSize: 8, opacity: 0.55, flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
      )}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {d.kind === 'shared' ? '👥' : '📓'} {d.name}
      </span>
      {(hover || active) && onRename && (
        <button title="Rename" style={iconBtn}
          onClick={e => { e.stopPropagation(); onRename() }}>✎</button>
      )}
      {(hover || active) && onDelete && (
        <button title="Delete" style={iconBtn}
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
      <span style={{ display: 'inline-block', width: 10, fontSize: 9, opacity: 0.7 }}>{isOpen ? '▼' : '▶'}</span>
      {label.toUpperCase()}
    </div>
  )
}
