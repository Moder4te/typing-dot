import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { EmotionLabel } from '../types'
import { analyzeEmotion } from '../lib/emotionAnalyzer'
import { resolveEmotion } from '../lib/emotionMomentum'
import { loadEmotionFonts } from '../lib/fontLoader'
import type { EmotionFontMap } from '../types'
import emotionFontsJson from '../data/emotion-fonts.json'
import { useCanvasData } from '../hooks/useCanvasData'
import { useAuth } from '../auth/AuthProvider'
import { entitlementsFor } from '../lib/entitlements'
import { useTheme } from '../hooks/useTheme'
import { usePalette } from '../hooks/usePalette'
import { DEFAULT_INK } from '../lib/palette'
import InfiniteCanvas from '../components/InfiniteCanvas'
import Sidebar from '../components/Sidebar'
import AccountMenu from '../components/AccountMenu'
import MigrationBanner from '../components/MigrationBanner'
import ShareImageModal from '../components/ShareImageModal'
import SelectionOverlay, { type ClientRect } from '../components/SelectionOverlay'
import PaletteEditor from '../components/PaletteEditor'
import Onboarding from '../components/Onboarding'

const EMOTION_FONT_MAP = emotionFontsJson as EmotionFontMap
const DEFAULT_FONT = EMOTION_FONT_MAP['neutral']?.fonts[0]?.family ?? 'TD_neutral_1'

export default function CanvasPage() {
  const data = useCanvasData()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const ent = entitlementsFor(profile?.tier ?? 'free')
  const theme = useTheme()
  const palette = usePalette()
  const [textColor, setTextColor] = useState<string>(DEFAULT_INK)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selection, setSelection] = useState<ClientRect | null>(null)

  const openShare = useCallback(() => {
    if (!ent.exportEnabled) { navigate('/pricing'); return }
    ;(document.activeElement as HTMLElement | null)?.blur() // flush pending text + hide caret
    setTimeout(() => setSelecting(true), 60)
  }, [ent.exportEnabled, navigate])

  const emotionHistoryRef = useRef<EmotionLabel[]>([])
  const currentFontFamilyRef = useRef<string>(DEFAULT_FONT)
  const [currentFont, setCurrentFont] = useState<string>(DEFAULT_FONT)
  const [histSnapshot, setHistSnapshot] = useState<EmotionLabel[]>([])
  const [notification, setNotification] = useState<string | null>(null)
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNotification = useCallback((msg: string) => {
    setNotification(msg)
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(() => setNotification(null), 3000)
  }, [])

  useEffect(() => { loadEmotionFonts(EMOTION_FONT_MAP) }, [])

  const analyzeText = useMemo(
    () => (text: string) => analyzeEmotion(text, showNotification),
    [showNotification]
  )

  const { updateBlock } = data
  const handleEmotionAnalyzed = useCallback(
    (id: string, rawEmotion: EmotionLabel) => {
      const { resolvedEmotion, fontFamily, newHistory } = resolveEmotion(
        rawEmotion, emotionHistoryRef.current, EMOTION_FONT_MAP
      )
      emotionHistoryRef.current = newHistory
      currentFontFamilyRef.current = fontFamily
      setCurrentFont(fontFamily)
      setHistSnapshot(newHistory)
      updateBlock(id, { emotion: resolvedEmotion, fontFamily, emotionHistory: newHistory })
    },
    [updateBlock]
  )

  if (data.loading) {
    return (
      <div style={{
        height: '100vh', display: 'grid', placeItems: 'center',
        background: '#fafafa', color: 'rgba(0,0,0,0.3)', fontSize: 13,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      }}>
        불러오는 중…
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <InfiniteCanvas
        key={`${data.activeDiaryId ?? 'local'}-${data.activeMonth}`}
        yearMonth={data.activeMonth}
        blocks={data.blocks}
        currentFontFamily={currentFont}
        currentEmotionHistory={histSnapshot}
        textColor={textColor}
        palette={palette}
        analyzeText={analyzeText}
        onCreateBlock={data.createBlock}
        onUpdateBlock={data.updateBlock}
        onEmotionAnalyzed={handleEmotionAnalyzed}
        onPickColor={setTextColor}
        notification={notification}
        blockRev={data.revs}
        theme={theme}
      />
      <Sidebar
        months={data.months}
        current={data.activeMonth}
        onSelect={data.selectMonth}
        onNewMonth={data.newMonth}
        diaries={data.diaries}
        activeDiaryId={data.activeDiaryId}
        onSelectDiary={data.selectDiary}
        historyLimit={ent.unlimitedHistory ? null : 3}
      />
      <AccountMenu />

      {/* Bottom-left toolbar: color swatch + share */}
      <div style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9998, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setPaletteOpen(true)}
          title="글씨 색 · 퀵메뉴 등록"
          style={{
            width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
            background: textColor, border: '2px solid #fff',
            boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
          }}
        />
        <button
          onClick={openShare}
          title={ent.exportEnabled ? '이미지로 공유' : 'Pro 전용 — 이미지로 공유'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 13px', fontSize: 12, fontWeight: 600,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            background: '#fff', color: '#1a1a1a',
            border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)', cursor: 'pointer',
          }}
        >
          📷 공유{!ent.exportEnabled && <span style={{ fontSize: 10, opacity: 0.6 }}>🔒</span>}
        </button>
      </div>

      {data.pendingMigration && (
        <MigrationBanner onImport={data.runMigration} onDismiss={data.dismissMigration} />
      )}
      {selecting && (
        <SelectionOverlay
          onSelect={(r) => { setSelecting(false); setSelection(r) }}
          onCancel={() => setSelecting(false)}
        />
      )}
      {selection && (
        <ShareImageModal
          selection={selection}
          background={theme.bg}
          onClose={() => setSelection(null)}
        />
      )}
      {paletteOpen && (
        <PaletteEditor
          palette={palette}
          current={textColor}
          onPickCurrent={setTextColor}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      <Onboarding />
    </div>
  )
}
