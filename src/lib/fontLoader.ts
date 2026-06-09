import type { EmotionFontMap } from '../types'

const loaded = new Set<string>()

// Registers every emotion font variant as an @font-face from public/fonts/.
export function loadEmotionFonts(fontMap: EmotionFontMap): void {
  const css: string[] = []
  for (const entry of Object.values(fontMap)) {
    for (const { family, file } of entry.fonts) {
      if (loaded.has(file)) continue
      loaded.add(file)
      const ext = file.split('.').pop()?.toLowerCase() ?? 'ttf'
      const fmt = ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : ext === 'otf' ? 'opentype' : 'truetype'
      css.push(`@font-face{font-family:"${family}";src:url("/${file}") format("${fmt}");font-display:swap;}`)
    }
  }
  if (css.length) {
    const style = document.createElement('style')
    style.textContent = css.join('\n')
    document.head.appendChild(style)
  }
}
