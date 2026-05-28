import { useRef, useEffect, useState, useCallback } from 'react'
import type { TextBlock as TextBlockType, StrokeRecord, EmotionLabel } from '../types'
import type { TypographyProps } from '../lib/typographyCalc'
import { useTypingRhythm } from '../hooks/useTypingRhythm'
import { calcTypography, BASE_FONT_SIZE } from '../lib/typographyCalc'
import { meetsSignalThreshold } from '../lib/emotionAnalyzer'

interface CommittedChar {
  char: string
  fontSize: number
  fontWeight: number
  isItalic: boolean
}

interface Props {
  block: TextBlockType
  isActive: boolean
  analyzeText: (text: string) => Promise<EmotionLabel>
  onUpdate: (id: string, text: string, strokes: StrokeRecord[]) => void
  onEmotionAnalyzed: (id: string, emotion: EmotionLabel) => void
  onActivate: (id: string) => void
}

export default function TextBlock({
  block, isActive, analyzeText, onUpdate, onEmotionAnalyzed, onActivate,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { recordKeystroke, getStrokes } = useTypingRhythm(block.strokes)

  const initTypo: TypographyProps = {
    fontSize: block.fontSize,
    fontWeight: block.fontWeight,
    isItalic: block.isItalic,
  }

  // Per-character committed array
  const [committed, setCommitted] = useState<CommittedChar[]>(() =>
    block.text.split('').map(char => ({ char, ...initTypo }))
  )
  const committedRef = useRef(committed)

  // Currently-typing char (live, not yet committed)
  const [pendingChar, setPendingChar] = useState('')
  const pendingCharRef = useRef('')

  // Live typography (updates on every keystroke)
  const [liveTypo, setLiveTypo] = useState<TypographyProps>(initTypo)
  const liveTypoRef = useRef<TypographyProps>(initTypo)

  const isComposingRef = useRef(false)
  const consecutiveBsRef = useRef(0)
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAnalyzedTextRef = useRef(block.text)
  const isAnalyzingRef = useRef(false)
  const prevFontFamilyRef = useRef(block.fontFamily)
  const [fontChanging, setFontChanging] = useState(false)

  useEffect(() => {
    if (block.fontFamily !== prevFontFamilyRef.current) {
      prevFontFamilyRef.current = block.fontFamily
      setFontChanging(true)
      const t = setTimeout(() => setFontChanging(false), 350)
      return () => clearTimeout(t)
    }
  }, [block.fontFamily])

  useEffect(() => {
    if (isActive) textareaRef.current?.focus()
  }, [isActive])

  const getFullText = useCallback(() =>
    committedRef.current.map(c => c.char).join('') + pendingCharRef.current,
  [])

  const triggerAnalysis = useCallback((text: string) => {
    if (isAnalyzingRef.current) return
    if (text === lastAnalyzedTextRef.current) return
    if (!meetsSignalThreshold(text)) return
    isAnalyzingRef.current = true
    analyzeText(text).then(emotion => {
      lastAnalyzedTextRef.current = text
      isAnalyzingRef.current = false
      onEmotionAnalyzed(block.id, emotion)
    })
  }, [analyzeText, block.id, onEmotionAnalyzed])

  const scheduleAnalysis = useCallback((text: string) => {
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current)
    analysisTimerRef.current = setTimeout(() => triggerAnalysis(text), 1500)
  }, [triggerAnalysis])

  // Freeze pending char into committed with current liveTypo
  const flushPending = useCallback(() => {
    const char = pendingCharRef.current
    if (!char) return
    const typo = liveTypoRef.current
    committedRef.current = [...committedRef.current, { char, ...typo }]
    setCommitted([...committedRef.current])
    pendingCharRef.current = ''
    setPendingChar('')
    console.log(`[커밋] "${char === '\n' ? '↵' : char}" size=${typo.fontSize.toFixed(2)}x weight=${typo.fontWeight} italic=${typo.isItalic}`)
  }, [])

  // Recalculate and update liveTypo from current strokes
  const refreshTypo = useCallback(() => {
    const strokes = getStrokes()
    const typo = calcTypography(strokes, consecutiveBsRef.current)
    liveTypoRef.current = typo
    setLiveTypo(typo)
    const validN = strokes.filter(s => !s.isBackspace && s.iki > 0 && s.iki < 5000).length
    console.info(`[타이포] size=${typo.fontSize.toFixed(2)}x weight=${typo.fontWeight} italic=${typo.isItalic} (샘플 ${validN}개)`)
  }, [getStrokes])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isBs = e.key === 'Backspace'
    if (isBs) consecutiveBsRef.current++
    else consecutiveBsRef.current = 0

    const { iki } = recordKeystroke(isBs)
    console.log(`[리듬] key="${e.key}" iki=${iki}ms bs연속=${consecutiveBsRef.current} composing=${e.nativeEvent.isComposing}`)

    // During IME composition, typography update deferred to compositionEnd
    if (e.nativeEvent.isComposing) return

    refreshTypo()

    if (isBs) {
      // Remove last char
      if (pendingCharRef.current) {
        pendingCharRef.current = ''
        setPendingChar('')
      } else if (committedRef.current.length > 0) {
        committedRef.current = committedRef.current.slice(0, -1)
        setCommitted([...committedRef.current])
      }
      scheduleAnalysis(getFullText())
      return
    }

    // New char is about to arrive: freeze current pending with current liveTypo
    if (pendingCharRef.current) {
      flushPending()
    }
    // Actual new char value comes in via onChange
  }, [recordKeystroke, refreshTypo, flushPending, scheduleAnalysis, getFullText])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value

    if (isComposingRef.current) {
      // Show composing state as pending
      const committedStr = committedRef.current.map(c => c.char).join('')
      const composing = newVal.slice(committedStr.length)
      pendingCharRef.current = composing
      setPendingChar(composing)
      scheduleAnalysis(newVal)
      return
    }

    const committedStr = committedRef.current.map(c => c.char).join('')

    if (newVal.length > committedStr.length) {
      const remainder = newVal.slice(committedStr.length)
      if (remainder.length === 1) {
        // Normal single-char input
        pendingCharRef.current = remainder
        setPendingChar(remainder)
      } else {
        // Paste / multiple chars: all but last go to committed, last is pending
        const bulk = remainder.slice(0, -1)
        const bulkEntries: CommittedChar[] = bulk.split('').map(char => ({ char, ...liveTypoRef.current }))
        committedRef.current = [...committedRef.current, ...bulkEntries]
        setCommitted([...committedRef.current])
        pendingCharRef.current = remainder.slice(-1)
        setPendingChar(remainder.slice(-1))
      }
    }

    scheduleAnalysis(newVal)
  }, [scheduleAnalysis])

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false
    refreshTypo()

    const composed = e.data
    if (composed) {
      const typo = liveTypoRef.current
      committedRef.current = [...committedRef.current, { char: composed, ...typo }]
      setCommitted([...committedRef.current])
      console.log(`[커밋/IME] "${composed}" size=${typo.fontSize.toFixed(2)}x weight=${typo.fontWeight} italic=${typo.isItalic}`)
    }
    pendingCharRef.current = ''
    setPendingChar('')

    scheduleAnalysis(committedRef.current.map(c => c.char).join(''))
  }, [refreshTypo, scheduleAnalysis])

  const handleBlur = useCallback(() => {
    if (pendingCharRef.current) flushPending()
    const strokes = getStrokes()
    const text = committedRef.current.map(c => c.char).join('')
    onUpdate(block.id, text, strokes)
    triggerAnalysis(text)
  }, [block.id, getStrokes, onUpdate, triggerAnalysis, flushPending])

  const fullText = committed.map(c => c.char).join('') + pendingChar

  return (
    <div
      style={{ position: 'absolute', left: block.x, top: block.y, minWidth: 220 }}
      onClick={() => { onActivate(block.id); textareaRef.current?.focus() }}
    >
      {/* 빈 블록 … 커서 */}
      {isActive && fullText === '' && (
        <div style={{
          position: 'absolute', top: 4, left: 0,
          fontSize: BASE_FONT_SIZE * liveTypo.fontSize,
          fontFamily: block.fontFamily,
          color: '#fc2b32',
          pointerEvents: 'none',
          animation: 'ellipsisBlink 1.2s ease-in-out infinite',
          userSelect: 'none',
        }}>…</div>
      )}

      {/* 키보드 입력 전담 textarea (invisible) */}
      <textarea
        ref={textareaRef}
        value={fullText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onBlur={handleBlur}
        rows={1}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: 2000, height: '1px',
          opacity: 0, resize: 'none',
          border: 'none', outline: 'none',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* 글자별 스타일 적용 디스플레이 */}
      <div
        style={{
          fontFamily: block.fontFamily,
          width: 2000,
          minHeight: 32,
          padding: '4px 0',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          opacity: fontChanging ? 0.6 : 1,
          cursor: 'text',
          userSelect: 'none',
        }}
      >
        {committed.map((c, i) => (
          <span
            key={i}
            style={{
              fontFamily: block.fontFamily,
              fontSize: `${BASE_FONT_SIZE * c.fontSize}px`,
              fontWeight: c.fontWeight,
              fontStyle: c.isItalic ? 'italic' : 'normal',
              color: '#1a1a1a',
            }}
          >
            {c.char}
          </span>
        ))}

        {/* 현재 입력 중인 글자 (live typography) */}
        <span
          style={{
            fontFamily: block.fontFamily,
            fontSize: `${BASE_FONT_SIZE * liveTypo.fontSize}px`,
            fontWeight: liveTypo.fontWeight,
            fontStyle: liveTypo.isItalic ? 'italic' : 'normal',
            color: '#1a1a1a',
          }}
        >
          {pendingChar}
        </span>

        {/* 커서 */}
        {isActive && (
          <span
            style={{
              display: 'inline-block',
              width: 2,
              height: `${BASE_FONT_SIZE * liveTypo.fontSize * 0.85}px`,
              background: '#fc2b32',
              verticalAlign: 'text-bottom',
              animation: 'caretBlink 1s step-end infinite',
              marginLeft: 1,
            }}
          />
        )}
      </div>

      {/* 활성 블록 하단 라인 */}
      {isActive && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 1, background: '#fc2b32', opacity: 0.25,
        }} />
      )}
    </div>
  )
}
