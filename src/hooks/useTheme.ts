import { useSyncExternalStore } from 'react'
import { getTheme, THEME_EVENT, type Theme } from '../lib/theme'

let cache: Theme = getTheme()

function subscribe(cb: () => void) {
  const handler = () => { cache = getTheme(); cb() }
  window.addEventListener(THEME_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(THEME_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

// Current canvas theme, reactive to changes from any page.
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => cache, () => cache)
}
