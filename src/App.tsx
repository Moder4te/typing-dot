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

const EMOTION_FONT_MAP = emotionFontsJson as EmotionFontMap
const DEFAULT_FONT = EMOTION_FONT_MAP['neutral']?.family ?? 'Noto Serif KR'

export default function App() {
  // 설정
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  // 감정 모멘텀 이력 (전역, 세션 기준)
  const emotionHistoryRef = useRef<EmotionLabel[]>([])

  // 현재 적용 중인 폰트 (새 블록 생성 시 상속)
  const currentFontFamilyRef = useRef<string>(DEFAULT_FONT)

  // 에러/상태 알림
  const [notification, setNotification] = useState<string | null>(null)
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNotification = useCallback((msg: string) => {
    setNotification(msg)
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
    notifTimerRef.current = setTimeout(() => setNotification(null), 3000)
  }, [])

  // 월 목록
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

  // 폰트 미리 로드
  useEffect(() => {
    loadEmotionFonts(EMOTION_FONT_MAP)
  }, [])

  // 설정 저장
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // 엔트리 저장
  useEffect(() => {
    saveEntry(entry)
  }, [entry])

  // AI 분석 함수 — settings가 바뀌면 새로 생성
  const analyzeText = useMemo(
    () => (text: string) =>
      analyzeEmotion(text, settings, showNotification),
    [settings, showNotification]
  )

  // AI 분석 결과 처리 + 감정 모멘텀 적용
  const handleEmotionAnalyzed = useCallback(
    (id: string, rawEmotion: EmotionLabel) => {
      const { resolvedEmotion, fontFamily, newHistory } = resolveEmotion(
        rawEmotion,
        emotionHistoryRef.current,
        EMOTION_FONT_MAP
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

  // 블록 텍스트/스트로크 업데이트
  const handleBlocksChange = useCallback((blocks: TextBlock[]) => {
    setEntry(prev => ({ ...prev, blocks, updatedAt: Date.now() }))
  }, [])

  // 월 선택
  const handleMonthSelect = useCallback((month: string) => {
    setActiveMonth(month)
    setEntry(loadEntry(month) ?? makeEntry(month))
  }, [])

  // 새 달 추가
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
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <Sidebar
        months={months}
        current={activeMonth}
        settings={settings}
        onSelect={handleMonthSelect}
        onNewMonth={handleNewMonth}
        onSettingsChange={setSettings}
      />
      <div style={{ flex: 1, position: 'relative' }}>
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
      </div>
    </div>
  )
}
