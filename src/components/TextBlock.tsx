import { useRef, useEffect, useState, useCallback } from 'react'
import type { TextBlock as TextBlockType, StrokeRecord, EmotionLabel } from '../types'
import type { TypographyProps } from '../lib/typographyCalc'
import { useTypingRhythm } from '../hooks/useTypingRhythm'
import { calcTypography, BASE_FONT_SIZE } from '../lib/typographyCalc'
import { meetsSignalThreshold } from '../lib/emotionAnalyzer'
import { logger } from '../lib/logger'

interface CommittedChar {
  char: string
  fontSize: number
  fontWeight: number
  isItalic: boolean
  color?: string
}

const DEFAULT_INK = '#1a1a1a'

interface Props {
  block: TextBlockType
  isActive: boolean
  textColor: string
  lineSnap?: number
  analyzeText: (text: string) => Promise<EmotionLabel>
  onUpdate: (id: string, text: string, strokes: StrokeRecord[], charStyles: CommittedChar[]) => void
  onEmotionAnalyzed: (id: string, emotion: EmotionLabel) => void
  onActivate: (id: string) => void
}

export default function TextBlock({
  block, isActive, textColor, lineSnap, analyzeText, onUpdate, onEmotionAnalyzed, onActivate,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { recordKeystroke, getStrokes } = useTypingRhythm(block.strokes)
  const textColorRef = useRef(textColor)
  useEffect(() => { textColorRef.current = textColor }, [textColor])

  const initTypo: TypographyProps = {
    fontSize: block.fontSize,
    fontWeight: block.fontWeight,
    isItalic: block.isItalic,
  }

  const [committed, setCommitted] = useState<CommittedChar[]>(() =>
    // Restore per-character styling from storage; fall back to uniform block-level
    // style only for legacy blocks saved before charStyles existed.
    block.charStyles && block.charStyles.length === block.text.length
      ? block.charStyles.map(c => ({ ...c }))
      : block.text.split('').map(char => ({ char, ...initTypo }))
  )
  const committedRef = useRef(committed)

  const [pendingChar, setPendingChar] = useState('')
  const pendingCharRef = useRef('')

  const [liveTypo, setLiveTypo] = useState<TypographyProps>(initTypo)
  const liveTypoRef = useRef<TypographyProps>(initTypo)

  const isComposingRef = useRef(false)
  const consecutiveBsRef = useRef(0)
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // Autosave: persist committed text + per-char styles ~0.9s after the last
  // input, so a refresh/tab-close while focused no longer loses the block.
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const text = committedRef.current.map(c => c.char).join('')
      onUpdate(block.id, text, getStrokes(), committedRef.current)
    }, 900)
  }, [block.id, onUpdate, getStrokes])

  const scheduleAnalysis = useCallback((text: string) => {
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current)
    analysisTimerRef.current = setTimeout(() => triggerAnalysis(text), 1500)
    scheduleSave()
  }, [triggerAnalysis, scheduleSave])

  const flushPending = useCallback(() => {
    const char = pendingCharRef.current
    if (!char) return
    const typo = liveTypoRef.current
    committedRef.current = [...committedRef.current, { char, ...typo, color: textColorRef.current }]
    setCommitted([...committedRef.current])
    pendingCharRef.current = ''
    setPendingChar('')
    logger.log(`[커밋] "${char === '\n' ? '↵' : char}" size=${typo.fontSize.toFixed(2)}x weight=${typo.fontWeight}`)
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
        const bulkEntries: CommittedChar[] = bulk.split('').map(char => ({ char, ...liveTypoRef.current, color: textColorRef.current }))
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

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
    consecutiveBsRef.current = 0
    refreshTypo()

    // Read from the textarea directly — more reliable than e.data across browsers/devices
    const finalVal = textareaRef.current?.value ?? ''
    const prevStr = committedRef.current.map(c => c.char).join('')
    const newPart = finalVal.slice(prevStr.length)

    if (newPart) {
      const typo = liveTypoRef.current
      const newEntries: CommittedChar[] = newPart.split('').map(char => ({ char, ...typo, color: textColorRef.current }))
      committedRef.current = [...committedRef.current, ...newEntries]
      setCommitted([...committedRef.current])
      logger.log(`[커밋/IME] "${newPart}" size=${typo.fontSize.toFixed(2)}x weight=${typo.fontWeight}`)
    }

    pendingCharRef.current = ''
    setPendingChar('')
    scheduleAnalysis(committedRef.current.map(c => c.char).join(''))
  }, [refreshTypo, scheduleAnalysis])

  const handleBlur = useCallback(() => {
    if (pendingCharRef.current) flushPending()
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const strokes = getStrokes()
    const text = committedRef.current.map(c => c.char).join('')
    // Re-sync textarea value on blur to ensure next focus starts clean
    if (textareaRef.current) textareaRef.current.value = text
    onUpdate(block.id, text, strokes, committedRef.current)
    triggerAnalysis(text)
  }, [block.id, getStrokes, onUpdate, triggerAnalysis, flushPending])

  const fullText = committed.map(c => c.char).join('') + pendingChar

  return (
    <div
      data-block
      style={{ position: 'absolute', left: block.x, top: block.y, minWidth: 220 }}
      onClick={() => { onActivate(block.id); textareaRef.current?.focus() }}
    >
      {/* Waving "..." cursor for empty active block (ported from original UI) */}
      {isActive && fullText === '' && (
        <div data-noexport="1" style={{
          position: 'absolute', top: 4, left: 0,
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <EllipsisCursor fontSize={BASE_FONT_SIZE * liveTypo.fontSize} color={textColor} />
        </div>
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
          minHeight: lineSnap ?? 32,
          padding: lineSnap ? 0 : '4px 0',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: lineSnap ? `${lineSnap}px` : 1.6,
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
              color: c.color ?? DEFAULT_INK,
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
            color: textColor,
          }}
        >
          {pendingChar}
        </span>

        {/* Waving "..." caret after text (ported from original UI) */}
        {isActive && fullText !== '' && (
          <EllipsisCursor fontSize={BASE_FONT_SIZE * liveTypo.fontSize} color={textColor} />
        )}
      </div>

      {/* Active block underline */}
      {isActive && (
        <div data-noexport="1" style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 1, background: '#fc2b32', opacity: 0.25,
        }} />
      )}
    </div>
  )
}

/** Waving three-dot "..." cursor — the brand's signature typing motion.
 *  Dots animate via the .dot1/.dot2/.dot3 classes in index.css. */
function EllipsisCursor({ fontSize, color = '#fc2b32' }: { fontSize: number; color?: string }) {
  return (
    <span
      data-noexport="1"
      style={{
        display: 'inline-flex',
        gap: 1,
        marginLeft: 2,
        verticalAlign: 'baseline',
        fontSize,
        color,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span className="dot1">.</span>
      <span className="dot2">.</span>
      <span className="dot3">.</span>
    </span>
  )
}
