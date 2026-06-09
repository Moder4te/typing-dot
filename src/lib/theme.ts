// Canvas themes — a Pro perk. Patterns live on the world layer so they pan with
// content; `lineHeight` marks a ruled theme that snaps typing to its lines.
export interface Theme {
  id: string
  name: string
  bg: string            // container base color
  world?: string        // CSS background-image for the world layer (lines / texture)
  worldSize?: string    // background-size
  lineHeight?: number   // px; ruled themes snap text to this spacing
  dots?: boolean        // default dot grid (when no world pattern)
}

export const THEMES: Theme[] = [
  { id: 'plain', name: '기본', bg: '#fafafa', dots: true },
  {
    id: 'lined', name: '줄노트', bg: '#fcfcf7', lineHeight: 36,
    world: 'repeating-linear-gradient(to bottom, transparent 0, transparent 35px, rgba(40,70,150,0.16) 35px, rgba(40,70,150,0.16) 36px)',
  },
  {
    id: 'grid', name: '모눈', bg: '#fdfdfb',
    world: 'repeating-linear-gradient(to right, rgba(0,0,0,0.06) 0 1px, transparent 1px 28px), repeating-linear-gradient(to bottom, rgba(0,0,0,0.06) 0 1px, transparent 1px 28px)',
  },
  {
    id: 'oldpaper', name: '옛 종이', bg: '#ece0c4',
    world:
      'radial-gradient(circle at 18% 28%, rgba(120,90,40,0.10) 0 14px, transparent 16px),' +
      'radial-gradient(circle at 72% 62%, rgba(110,80,35,0.09) 0 18px, transparent 20px),' +
      'radial-gradient(circle at 45% 85%, rgba(130,100,50,0.08) 0 12px, transparent 14px)',
    worldSize: '190px 190px, 240px 240px, 160px 160px',
  },
  {
    id: 'kraft', name: '크라프트지', bg: '#d6c09a',
    world:
      'radial-gradient(circle at 30% 40%, rgba(90,60,20,0.10) 0 10px, transparent 12px),' +
      'radial-gradient(circle at 80% 70%, rgba(80,55,18,0.08) 0 14px, transparent 16px)',
    worldSize: '120px 120px, 170px 170px',
  },
]

const KEY = 'typing_dot_theme_id'
const EVENT = 'typingdot:themechange'

export function getTheme(): Theme {
  const id = localStorage.getItem(KEY)
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

export function setTheme(id: string): void {
  localStorage.setItem(KEY, id)
  window.dispatchEvent(new CustomEvent(EVENT))
}

export const THEME_EVENT = EVENT
