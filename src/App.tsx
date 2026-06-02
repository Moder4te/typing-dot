import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { TextBlock, EmotionLabel, AppSettings } from './types'
import {
  loadEntry, saveEntry, listMonths, currentYearMonth, makeEntry,
  loadSettings, saveSettings,
} from './lib/storage'
import { analyzeEmotion } from './lib/emotionAnalyzer'
import { resolveEmotion } from './lib/emotionMomentum'
import { loadEmotionFonts } from './lib/fontLoader'
import type { EmotionFontMap } from './types'
import emotionFontsJson from './data/emotion-fonts.json'
import InfiniteCanvas from './components/InfiniteCanvas'
import Sidebar from './components/Sidebar'
import DebugConsole from './components/DebugConsole'
import AnalyzeButton from './components/AnalyzeButton'

const EMOTION_FONT_MAP = emotionFontsJson as EmotionFontMap
const DEFAULT_FONT = EMOTION_FONT_MAP['neutral']?.family ?? 'Noto Serif KR'

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const emotionHistoryRef = useRef<EmotionLabel[]>([])
  const currentFontFamilyRef = useRef<string>(DEFAULT_FONT)
  const [notification, setNotification] = useState<string | null>(null)
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNotification = useCallback((msg: string) => {
    setNotification(msg)
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(() => setNotification(null), 3000)
  }, [])

  const [months, setMonths] = useState<string[]>(() => {
    const stored = listMonths()
    const current = currentYearMonth()
    return stored.includes(current) ? stored : [current, ...stored]
  })

  const [activeMonth, setActiveMonth] = useState<string>(currentYearMonth)

  const [entry, setEntry] = useState(() => {
    const ym = currentYearMonth()
    return loadEntry(ym) ?? makeEntry(ym)
  })

  useEffect(() => { loadEmotionFonts(EMOTION_FONT_MAP) }, [])
  useEffect(() => { saveSettings(settings) }, [settings])
  useEffect(() => { saveEntry(entry) }, [entry])

  const analyzeText = useMemo(
    () => (text: string) => analyzeEmotion(text, settings, showNotification),
    [settings, showNotification]
  )

  const handleEmotionAnalyzed = useCallback(
    (id: string, rawEmotion: EmotionLabel) => {
      const { resolvedEmotion, fontFamily, newHistory } = resolveEmotion(
        rawEmotion, emotionHistoryRef.current, EMOTION_FONT_MAP
      )
      emotionHistoryRef.current = newHistory
      currentFontFamilyRef.current = fontFamily

      setEntry(prev => ({
        ...prev,
        blocks: prev.blocks.map(b =>
          b.id === id
            ? { ...b, emotion: resolvedEmotion, fontFamily, emotionHistory: newHistory }
            : b
        ),
        updatedAt: Date.now(),
      }))
    },
    []
  )

  const handleForceAnalyze = useCallback(async () => {
    const textBlocks = entry.blocks.filter(b => b.text.trim().length > 0)
    if (textBlocks.length === 0) return
    for (const block of textBlocks) {
      const raw = await analyzeEmotion(block.text, settings, showNotification, true)
      handleEmotionAnalyzed(block.id, raw)
    }
  }, [entry.blocks, settings, showNotification, handleEmotionAnalyzed])

  const handleBlocksChange = useCallback((blocks: TextBlock[]) => {
    setEntry(prev => ({ ...prev, blocks, updatedAt: Date.now() }))
  }, [])

  const handleMonthSelect = useCallback((month: string) => {
    setActiveMonth(month)
    setEntry(loadEntry(month) ?? makeEntry(month))
  }, [])

  const handleNewMonth = useCallback(() => {
    const [y, m] = (months[0] ?? currentYearMonth()).split('-').map(Number)
    const next = new Date(y, m, 1)
    const ym = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    if (months.includes(ym)) return
    const newEntry = makeEntry(ym)
    saveEntry(newEntry)
    setMonths(prev => [ym, ...prev])
    setActiveMonth(ym)
    setEntry(newEntry)
  }, [months])

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <InfiniteCanvas
        key={activeMonth}
        yearMonth={activeMonth}
        blocks={entry.blocks}
        currentFontFamily={currentFontFamilyRef.current}
        currentEmotionHistory={emotionHistoryRef.current}
        analyzeText={analyzeText}
        onBlocksChange={handleBlocksChange}
        onEmotionAnalyzed={handleEmotionAnalyzed}
        notification={notification}
      />
      <Sidebar
        months={months}
        current={activeMonth}
        settings={settings}
        onSelect={handleMonthSelect}
        onNewMonth={handleNewMonth}
        onSettingsChange={setSettings}
      />
      <AnalyzeButton onAnalyze={handleForceAnalyze} />
      <DebugConsole />
    </div>
  )
}
