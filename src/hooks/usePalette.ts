import { useSyncExternalStore } from 'react'
import { getPalette, PALETTE_EVENT } from '../lib/palette'

let cache: string[] = getPalette()

function subscribe(cb: () => void) {
  const handler = () => { cache = getPalette(); cb() }
  window.addEventListener(PALETTE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(PALETTE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

// Reactive 4-color palette (stable snapshot reference until it changes).
export function usePalette(): string[] {
  return useSyncExternalStore(subscribe, () => cache, () => cache)
}
