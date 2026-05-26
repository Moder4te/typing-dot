import { useRef, useCallback } from 'react'
import type { StrokeRecord } from '../types'

export function useTypingRhythm(initialStrokes: StrokeRecord[] = []) {
  const lastKeyTime = useRef<number>(0)
  const strokes = useRef<StrokeRecord[]>(initialStrokes)
  const charIndexRef = useRef<number>(
    initialStrokes.filter(s => !s.isBackspace).length
  )

  const recordKeystroke = useCallback(
    (isBackspace: boolean): { iki: number; stroke: StrokeRecord } => {
      const now = Date.now()
      const iki = lastKeyTime.current ? now - lastKeyTime.current : 0
      lastKeyTime.current = now

      const stroke: StrokeRecord = {
        charIndex: charIndexRef.current,
        timestamp: now,
        iki,
        isBackspace,
      }

      if (!isBackspace) charIndexRef.current++
      else if (charIndexRef.current > 0) charIndexRef.current--

      strokes.current.push(stroke)
      return { iki, stroke }
    },
    []
  )

  const getStrokes = useCallback(() => strokes.current, [])

  const reset = useCallback(() => {
    strokes.current = []
    charIndexRef.current = 0
    lastKeyTime.current = 0
  }, [])

  return { recordKeystroke, getStrokes, reset }
}
