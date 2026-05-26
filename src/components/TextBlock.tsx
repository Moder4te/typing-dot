import { useRef, useEffect, useState, useCallback } from 'react'
import type { TextBlock as TextBlockType, InkParticle, StrokeRecord, EmotionLabel } from '../types'
import { useTypingRhythm } from '../hooks/useTypingRhythm'
import { spawnParticles } from '../lib/inkEngine'
import { calcTypography, BASE_FONT_SIZE } from '../lib/typographyCalc'
import { meetsSignalThreshold } from '../lib/emotionAnalyzer'

interface Props {
  block: TextBlockType
  isActive: boolean
  analyzeText: (text: string) => Promise<EmotionLabel>
  onUpdate: (id: string, text: string, strokes: StrokeRecord[]) => void
  onEmotionAnalyzed: (id: string, emotion: EmotionLabel) => void
  onParticles: (particles: InkParticle[]) => void
  onActivate: (id: string) => void
}

const CHAR_W = 10.8
const LINE_H = 28

function getCaretWorldPos(ta: HTMLTextAreaElement, bx: number, by: number) {
  const sel = ta.selectionStart ?? ta.value.length
  const lines = ta.value.substring(0, sel).split('\n')
  return {
    x: bx + lines[lines.length - 1].length * CHAR_W + 4,
    y: by + (lines.length - 1) * LINE_H + LINE_H / 2,
  }
}

export default function TextBlock({
  block,
  isActive,
  analyzeText,
  onUpdate,
  onEmotionAnalyzed,
  onParticles,
  onActivate,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { recordKeystroke, getStrokes } = useTypingRhythm(block.strokes)

  const [text, setText] = useState(block.text)
  const [typography, setTypography] = useState({
    fontSize: block.fontSize,
    fontWeight: block.fontWeight,
    isItalic: block.isItalic,
  })
  const [fontChanging, setFontChanging] = useState(false)

  const consecutiveBsRef = useRef(0)
  const analysisTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAnalyzedTextRef = useRef(block.text)
  const isAnalyzingRef = useRef(false)
  const prevFontFamilyRef = useRef(block.fontFamily)

  // 폰트 변경 시 flash 애니메이션
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

  // textarea 높이 자동 조절
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }, [text])

  const triggerAnalysis = useCallback((currentText: string) => {
    if (isAnalyzingRef.current) return
    if (currentText === lastAnalyzedTextRef.current) return
    if (!meetsSignalThreshold(currentText)) return

    isAnalyzingRef.current = true
    analyzeText(currentText).then(emotion => {
      lastAnalyzedTextRef.current = currentText
      isAnalyzingRef.current = false
      onEmotionAnalyzed(block.id, emotion)
    })
  }, [analyzeText, block.id, onEmotionAnalyzed])

  const scheduleAnalysis = useCallback((currentText: string) => {
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current)
    analysisTimerRef.current = setTimeout(() => {
      triggerAnalysis(currentText)
    }, 1500)
  }, [triggerAnalysis])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isBs = e.key === 'Backspace'
      if (isBs) consecutiveBsRef.current++
      else consecutiveBsRef.current = 0

      const { iki } = recordKeystroke(isBs)

      // 잉크 파티클
      const ta = textareaRef.current
      if (ta) {
        const pos = getCaretWorldPos(ta, block.x, block.y)
        onParticles(spawnParticles(pos.x, pos.y, iki, isBs))
      }

      // 타이핑 리듬 → 폰트 크기/굵기/기울기 실시간 업데이트
      const strokes = getStrokes()
      setTypography(calcTypography(strokes, consecutiveBsRef.current))
    },
    [recordKeystroke, getStrokes, block.x, block.y, onParticles]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setText(val)
      scheduleAnalysis(val)
    },
    [scheduleAnalysis]
  )

  const handleBlur = useCallback(() => {
    const strokes = getStrokes()
    onUpdate(block.id, text, strokes)
    triggerAnalysis(text)
  }, [block.id, text, getStrokes, onUpdate, triggerAnalysis])

  const fontSize = BASE_FONT_SIZE * typography.fontSize

  return (
    <div
      style={{ position: 'absolute', left: block.x, top: block.y, minWidth: 220 }}
      onClick={() => onActivate(block.id)}
    >
      {/* … 커서 — 빈 블록이 활성화됐을 때 */}
      {isActive && text === '' && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 0,
            fontSize: fontSize,
            fontFamily: block.fontFamily,
            color: '#fc2b32',
            pointerEvents: 'none',
            animation: 'ellipsisBlink 1.2s ease-in-out infinite',
            userSelect: 'none',
          }}
        >
          …
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        rows={1}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: block.fontFamily,
          fontSize: `${fontSize}px`,
          fontWeight: typography.fontWeight,
          fontStyle: typography.isItalic ? 'italic' : 'normal',
          lineHeight: `${LINE_H}px`,
          color: '#1a1a1a',
          width: '320px',
          minHeight: `${LINE_H}px`,
          overflow: 'hidden',
          cursor: 'text',
          caretColor: text ? '#fc2b32' : 'transparent',
          padding: '4px 0',
          position: 'relative',
          zIndex: 2,
          transition: 'font-weight 0.15s ease, font-size 0.15s ease',
          opacity: fontChanging ? 0.6 : 1,
        }}
      />

      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            background: '#fc2b32',
            opacity: 0.25,
          }}
        />
      )}
    </div>
  )
}
