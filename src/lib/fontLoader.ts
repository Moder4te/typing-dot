import type { EmotionFontMap } from '../types'

const loaded = new Set<string>()

export function loadEmotionFonts(fontMap: EmotionFontMap): void {
  Object.values(fontMap).forEach(({ google }) => {
    if (loaded.has(google)) return
    loaded.add(google)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = google
    document.head.appendChild(link)
  })
}
