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

  const [committed, setCommitted] = useState<CommittedChar[]>(() =>
    block.text.split('').map(char => ({ char, ...initTypo }))
  )
  const committedRef = useRef(committed)

  const [pendingChar, setPendingChar] = useState('')
  const pendingCharRef = useRef('')

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
    if (isActive) {
      // Small delay helps iOS trigger the virtual keyboard
      const t = setTimeout(() => textareaRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
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

  const flushPending = useCallback(() => {
    const char = pendingCharRef.current
    if (!char) return
    const typo = liveTypoRef.current
    committedRef.current = [...committedRef.current, { char, ...typo }]
    setCommitted([...committedRef.current])
    pendingCharRef.current = ''
    setPendingChar('')
    console.log(`[커밋] "${char === '\n' ? '↵' : char}" size=${typo.fontSize.toFixed(2)}x weight=${typo.fontWeight}`)
  }, [])

  const refreshTypo = useCallback(() => {
    const strokes = getStrokes()
    const typo = calcTypography(strokes, consecutiveBsRef.current)
    liveTypoRef.current = typo
    setLiveTypo(typo)
  }, [getStrokes])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isBs = e.key === 'Backspace'
    if (isBs) consecutiveBsRef.current++
    else consecutiveBsRef.current = 0

    recordKeystroke(isBs)

    // Skip custom handling during IME composition.
    // Check BOTH the native flag AND our ref — some devices (iPadOS + Bluetooth keyboard)
    // report isComposing=false during Korean IME, causing each jamo to be committed individually.
    if (e.nativeEvent.isComposing || isComposingRef.current) return

    refreshTypo()

    if (isBs) {
      if (pendingCharRef.current) {
        pendingCharRef.current = ''
        setPendingChar('')
      } else if (committedRef.current.length > 0) {
        committedRef.current = committedRef.current.slice(0, -1)
        setCommitted([...committedRef.current])
        // Sync textarea value so subsequent onChange reads the right base
        if (textareaRef.current) {
          textareaRef.current.value = committedRef.current.map(c => c.char).join('')
        }
      }
      scheduleAnalysis(getFullText())
      return
    }

    // About to receive a new char via onChange — flush any pending first
    if (pendingCharRef.current) {
      flushPending()
    }
  }, [recordKeystroke, refreshTypo, flushPending, scheduleAnalysis, getFullText])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value

    if (isComposingRef.current) {
      // Show the in-progress composition as pending (not yet committed)
      const committedStr = committedRef.current.map(c => c.char).join('')
      const composing = newVal.slice(committedStr.length)
      pendingCharRef.current = composing
      setPendingChar(composing)
      scheduleAnalysis(newVal)
      return
    }

    const committedStr = committedRef.current.map(c => c.char).join('')
    const currentLen = committedStr.length + pendingCharRef.current.length

    if (newVal.length > committedStr.length) {
      const remainder = newVal.slice(committedStr.length)
      if (remainder.length === 1) {
        pendingCharRef.current = remainder
        setPendingChar(remainder)
      } else {
        // Paste or multi-char input
        const bulk = remainder.slice(0, -1)
        const bulkEntries: CommittedChar[] = bulk.split('').map(char => ({ char, ...liveTypoRef.current }))
        committedRef.current = [...committedRef.current, ...bulkEntries]
        setCommitted([...committedRef.current])
        pendingCharRef.current = remainder.slice(-1)
        setPendingChar(remainder.slice(-1))
      }
    } else if (newVal.length < currentLen) {
      // Deletion via onChange (Android virtual keyboard sends key="Unidentified")
      if (pendingCharRef.current) {
        pendingCharRef.current = ''
        setPendingChar('')
      }
      if (newVal.length < committedStr.length) {
        committedRef.current = committedRef.current.slice(0, newVal.length)
        setCommitted([...committedRef.current])
      }
    }

    scheduleAnalysis(newVal)
  }, [scheduleAnalysis])

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback((_e: React.CompositionEvent<HTMLTextAreaElement>) => {
    isComposingRef.current = false
    consecutiveBsRef.current = 0
    refreshTypo()

    // Read from the textarea directly — more reliable than e.data across browsers/devices
    const finalVal = textareaRef.current?.value ?? ''
    const prevStr = committedRef.current.map(c => c.char).join('')
    const newPart = finalVal.slice(prevStr.length)

    if (newPart) {
      const typo = liveTypoRef.current
      const newEntries: CommittedChar[] = newPart.split('').map(char => ({ char, ...typo }))
      committedRef.current = [...committedRef.current, ...newEntries]
      setCommitted([...committedRef.current])
      console.log(`[커밋/IME] "${newPart}" size=${typo.fontSize.toFixed(2)}x weight=${typo.fontWeight}`)
    }

    pendingCharRef.current = ''
    setPendingChar('')
    scheduleAnalysis(committedRef.current.map(c => c.char).join(''))
  }, [refreshTypo, scheduleAnalysis])

  const handleBlur = useCallback(() => {
    if (pendingCharRef.current) flushPending()
    const strokes = getStrokes()
    const text = committedRef.current.map(c => c.char).join('')
    // Re-sync textarea value on blur to ensure next focus starts clean
    if (textareaRef.current) textareaRef.current.value = text
    onUpdate(block.id, text, strokes)
    triggerAnalysis(text)
  }, [block.id, getStrokes, onUpdate, triggerAnalysis, flushPending])

  const fullText = committed.map(c => c.char).join('') + pendingChar

  return (
    <div
      style={{ position: 'absolute', left: block.x, top: block.y, minWidth: 220 }}
      onClick={() => { onActivate(block.id); textareaRef.current?.focus() }}
    >
      {/* Ellipsis cursor for empty active block */}
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

      {/* Invisible textarea — handles all keyboard/IME input.
          Uncontrolled (no value prop) so React never resets the DOM value mid-composition,
          which is the root cause of the jamo-splitting bug on iPadOS/mobile. */}
      <textarea
        ref={textareaRef}
        defaultValue={block.text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onBlur={handleBlur}
        inputMode="text"
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        rows={1}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%',
          height: 44,           // iOS needs a non-trivial height to reliably focus
          fontSize: 16,         // Prevents iOS auto-zoom on focus
          opacity: 0,
          resize: 'none',
          border: 'none', outline: 'none',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'transparent',
          pointerEvents: isActive ? 'auto' : 'none',
          zIndex: isActive ? 3 : -1,
        }}
      />

      {/* Per-character styled display */}
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

        {/* Live composition char */}
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

        {/* Caret */}
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

      {/* Active block underline */}
      {isActive && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 1, background: '#fc2b32', opacity: 0.25,
        }} />
      )}
    </div>
  )
}
