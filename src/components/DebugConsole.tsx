import { useState, useEffect, useRef } from 'react'

export interface DebugEntry {
  id: number
  level: 'log' | 'warn' | 'error' | 'info'
  message: string
  time: string
}

let _push: ((entry: Omit<DebugEntry, 'id'>) => void) | null = null
let _counter = 0

export function debugLog(message: string, level: DebugEntry['level'] = 'log') {
  _push?.({ level, message, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) })
}

function collectRawData() {
  const PREFIX = 'typing_dot_'
  const SETTINGS_KEY = 'typing_dot_settings'
  const months: Record<string, unknown> = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PREFIX) || key === SETTINGS_KEY) continue
    try {
      months[key.replace(PREFIX, '')] = JSON.parse(localStorage.getItem(key) ?? '{}')
    } catch {
      months[key.replace(PREFIX, '')] = null
    }
  }

  return { exportedAt: new Date().toISOString(), userAgent: navigator.userAgent, months }
}

const LEVEL_COLOR: Record<DebugEntry['level'], string> = {
  log: '#1a1a1a',
  info: '#2563eb',
  warn: '#d97706',
  error: '#dc2626',
}

export default function DebugConsole() {
  const [entries, setEntries] = useState<DebugEntry[]>([])
  const [visible, setVisible] = useState(true)
  const [filter, setFilter] = useState<DebugEntry['level'] | 'all'>('all')
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    _push = (entry) => {
      setEntries(prev => {
        const next = [...prev, { ...entry, id: ++_counter }]
        return next.length > 200 ? next.slice(-200) : next
      })
    }

    const orig = {
      log: console.log, warn: console.warn,
      error: console.error, info: console.info,
    }

    const intercept = (level: DebugEntry['level']) =>
      (...args: unknown[]) => {
        orig[level](...args)
        const message = args.map(a =>
          typeof a === 'object' ? JSON.stringify(a, null, 0) : String(a)
        ).join(' ')
        _push?.({ level, message, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) })
      }

    console.log = intercept('log')
    console.warn = intercept('warn')
    console.error = intercept('error')
    console.info = intercept('info')

    return () => {
      Object.assign(console, orig)
      _push = null
    }
  }, [])

  useEffect(() => {
    if (hovered) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries, hovered])

  const handleMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setHovered(true)
  }
  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => setHovered(false), 150)
  }

  const handleCopyData = async () => {
    const raw = collectRawData()
    const json = JSON.stringify(raw, null, 2)
    await navigator.clipboard.writeText(json)
    setCopied(true)
    console.info(`[내보내기] 데이터 복사 완료 — ${Object.keys(raw.months).length}개 월, ${json.length} bytes`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyLog = async () => {
    const text = entries.map(e => `[${e.time}] ${e.level.toUpperCase()} ${e.message}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.level === filter)

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '1px 6px',
    fontSize: 9,
    background: active ? '#444' : 'transparent',
    color: '#ccc',
    border: '1px solid #444',
    borderRadius: 3,
    cursor: 'pointer',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
  })

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'fixed',
        bottom: 14,
        right: 14,
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      {/* Dot indicator when not hovered */}
      {!hovered && (
        <div style={{
          width: 8, height: 8,
          borderRadius: '50%',
          background: entries.some(e => e.level === 'error')
            ? '#dc2626'
            : entries.some(e => e.level === 'warn')
            ? '#d97706'
            : 'rgba(0,0,0,0.2)',
          cursor: 'default',
        }} />
      )}

      {/* Full console panel */}
      {hovered && (
        <div style={{
          width: 440,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.12)',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px',
            background: '#1e1e1e',
            color: '#ccc',
            userSelect: 'none',
          }}>
            <span style={{ flex: 1, letterSpacing: 1, fontSize: 10 }}>DEBUG CONSOLE</span>

            {(['all', 'log', 'info', 'warn', 'error'] as const).map(lv => (
              <button key={lv} onClick={() => setFilter(lv)} style={{
                ...btnStyle(filter === lv),
                color: lv === 'all' ? '#ccc' : LEVEL_COLOR[lv as DebugEntry['level']],
              }}>
                {lv.toUpperCase()}
              </button>
            ))}

            <button onClick={() => setEntries([])} style={btnStyle()}>CLR</button>
            <button onClick={() => setVisible(v => !v)} style={btnStyle()}>{visible ? '▼' : '▲'}</button>
          </div>

          {/* Export bar */}
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            padding: '5px 10px',
            background: '#161616',
            borderBottom: '1px solid #2a2a2a',
          }}>
            <span style={{ fontSize: 9, color: '#555', flex: 1, letterSpacing: 0.5 }}>RAW DATA EXPORT</span>
            <button
              onClick={handleCopyData}
              style={{
                padding: '3px 10px', fontSize: 9,
                background: copied ? '#166534' : '#1d4ed8',
                color: '#fff', border: 'none', borderRadius: 3,
                cursor: 'pointer', letterSpacing: 0.5,
                transition: 'background 0.2s',
                fontFamily: 'monospace',
              }}
            >
              {copied ? '✓ 복사됨' : '📋 타이핑 데이터 복사'}
            </button>
            <button
              onClick={handleCopyLog}
              style={{
                padding: '3px 10px', fontSize: 9,
                background: 'transparent', color: '#888',
                border: '1px solid #333', borderRadius: 3,
                cursor: 'pointer', letterSpacing: 0.5,
                fontFamily: 'monospace',
              }}
            >
              콘솔 로그 복사
            </button>
          </div>

          {/* Log area */}
          {visible && (
            <div style={{
              height: 220, overflowY: 'auto',
              background: '#111', padding: '6px 0',
            }}>
              {filtered.length === 0 && (
                <div style={{ color: '#555', padding: '4px 10px' }}>로그 없음</div>
              )}
              {filtered.map(e => (
                <div key={e.id} style={{
                  display: 'flex', gap: 6,
                  padding: '2px 10px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  color: LEVEL_COLOR[e.level],
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}>
                  <span style={{ color: '#555', flexShrink: 0 }}>{e.time}</span>
                  <span style={{
                    flexShrink: 0, width: 32,
                    color: LEVEL_COLOR[e.level],
                    opacity: 0.7, fontSize: 9, paddingTop: 1,
                  }}>{e.level.toUpperCase()}</span>
                  <span>{e.message}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
