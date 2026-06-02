import type { EmotionFontMap } from '../types'

const loaded = new Set<string>()

// Local fonts: place files in public/fonts/{emotion}/ then set in emotion-fonts.json:
//   "joy": { "family": "MyFont", "local": { "family": "MyFont", "file": "fonts/joy/MyFont.woff2" } }
export function loadEmotionFonts(fontMap: EmotionFontMap): void {
  Object.values(fontMap).forEach(({ google, local }) => {
    if (local) {
      if (loaded.has(local.file)) return
      loaded.add(local.file)
      const ext = local.file.split('.').pop()?.toLowerCase() ?? 'woff2'
      const fmt =
        ext === 'woff2' ? 'woff2' :
        ext === 'woff'  ? 'woff'  :
        ext === 'otf'   ? 'opentype' : 'truetype'
      const style = document.createElement('style')
      style.textContent = `@font-face{font-family:"${local.family}";src:url("/${local.file}") format("${fmt}");font-display:swap;}`
      document.head.appendChild(style)
    } else if (google) {
      if (loaded.has(google)) return
      loaded.add(google)
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = google
      document.head.appendChild(link)
    }
  })
}
