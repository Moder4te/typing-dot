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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    _push = (entry) => {
      setEntries(prev => {
        const next = [...prev, { ...entry, id: ++_counter }]
        return next.length > 200 ? next.slice(-200) : next
      })
    }

    // console 인터셉트
    const orig = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  const filtered = filter === 'all' ? entries : entries.filter(e => e.level === filter)

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      width: 420,
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: 11,
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      borderRadius: 6,
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.12)',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px',
        background: '#1e1e1e',
        color: '#ccc',
        userSelect: 'none',
      }}>
        <span style={{ flex: 1, letterSpacing: 1, fontSize: 10 }}>DEBUG CONSOLE</span>

        {(['all', 'log', 'info', 'warn', 'error'] as const).map(lv => (
          <button key={lv} onClick={() => setFilter(lv)} style={{
            padding: '1px 6px',
            fontSize: 9,
            background: filter === lv ? '#444' : 'transparent',
            color: lv === 'all' ? '#ccc' : LEVEL_COLOR[lv as DebugEntry['level']] || '#ccc',
            border: '1px solid #444',
            borderRadius: 3,
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}>
            {lv.toUpperCase()}
          </button>
        ))}

        <button onClick={() => setEntries([])} style={{
          padding: '1px 6px', fontSize: 9, background: 'transparent',
          color: '#888', border: '1px solid #444', borderRadius: 3, cursor: 'pointer',
        }}>CLR</button>

        <button onClick={() => setVisible(v => !v)} style={{
          padding: '1px 6px', fontSize: 9, background: 'transparent',
          color: '#888', border: '1px solid #444', borderRadius: 3, cursor: 'pointer',
        }}>{visible ? '▼' : '▲'}</button>
      </div>

      {/* 로그 영역 */}
      {visible && (
        <div style={{
          height: 240,
          overflowY: 'auto',
          background: '#111',
          padding: '6px 0',
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
                flexShrink: 0,
                width: 32,
                color: LEVEL_COLOR[e.level],
                opacity: 0.7,
                fontSize: 9,
                paddingTop: 1,
              }}>{e.level.toUpperCase()}</span>
              <span>{e.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
