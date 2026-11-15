// Procedural performer nebulae. A performer is session × family:
// the family sets the colors (its genres' palette colors) and texture,
// the session sets the morphology. The same canvases feed the bench,
// the merged stage and the subgenre system in the 3D scene.
import { seededRandom } from '../domain/catalog'
import type { Atlas } from '../domain/atlas'
import type { Catalog } from '../domain/catalog'

export interface NebulaSpec {
  family: number
  session: number
  colors: string[]
}

interface Texture { grain: number; sparkle: number; soft: number; glow: number }

// 밴드 · 전자 · 오케스트라 · 어쿠스틱 · 그루브 (atlas-model.json family order)
const FAMILY_TEXTURE: Texture[] = [
  { grain: 220, sparkle: 10, soft: .85, glow: .95 }, // band: gritty, high contrast
  { grain: 60, sparkle: 34, soft: .7, glow: 1 }, // electronic: crisp sparkles
  { grain: 20, sparkle: 8, soft: 1.25, glow: .8 }, // orchestra: smooth silk
  { grain: 160, sparkle: 12, soft: 1.05, glow: .8 }, // acoustic: soft dust
  { grain: 90, sparkle: 18, soft: 1, glow: .9 }, // groove: warm swirls
]

export const SESSION_FORM = ['고리', '불꽃', '구름', '실', '격자', '나선', '줄기', '소용돌이', '핵'] as const

export function performerSpec(atlas: Atlas, catalog: Catalog, performerId: number): NebulaSpec {
  const performer = atlas.performers[performerId]
  const colors = atlas.model.families[performer.family].genreIds.map(id => catalog.genreById.get(id)!.color)
  return { family: performer.family, session: performer.session, colors: colors.length > 1 ? colors : [colors[0], '#f7f2e4', colors[0]] }
}

function rgba(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1, 7), 16)
  return `rgba(${value >> 16 & 255},${value >> 8 & 255},${value & 255},${Math.max(0, Math.min(1, alpha))})`
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  if (r <= 0) return
  const gradient = g.createRadialGradient(x, y, 0, x, y, r)
  gradient.addColorStop(0, rgba(color, alpha))
  gradient.addColorStop(.45, rgba(color, alpha * .38))
  gradient.addColorStop(1, rgba(color, 0))
  g.fillStyle = gradient
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

/** Draw one nebula centered at (cx, cy) with radius R, additively. */
function drawNebula(g: CanvasRenderingContext2D, spec: NebulaSpec, cx: number, cy: number, R: number, intensity = 1) {
  const random = seededRandom(spec.family * 977 + spec.session * 131 + 7)
  const texture = FAMILY_TEXTURE[spec.family % FAMILY_TEXTURE.length]
  const color = (index: number) => spec.colors[index % spec.colors.length]
  const pick = () => spec.colors[Math.floor(random() * spec.colors.length)]
  const a = .5 * texture.glow * intensity
  const at = (x: number, y: number, r: number, c: string, alpha = a) => blob(g, cx + x * R, cy + y * R, r * R * texture.soft, c, alpha)
  g.save()
  g.globalCompositeOperation = 'lighter'
  // A faint common haze keeps every form reading as a nebula.
  at(0, 0, .95, color(0), a * .28)
  switch (spec.session) {
    case 0: // drums: concentric pulse rings
      for (let ring = 1; ring <= 3; ring++) for (let i = 0; i < 26; i++) {
        const t = i / 26 * Math.PI * 2 + ring, r = ring * .25 + (random() - .5) * .05
        at(Math.cos(t) * r, Math.sin(t) * r, .1, color(ring + i), a * (1.1 - ring * .2))
      }
      break
    case 1: // percussion: scattered bright clumps
      for (let i = 0; i < 26; i++) {
        const t = random() * Math.PI * 2, r = Math.sqrt(random()) * .78
        at(Math.cos(t) * r, Math.sin(t) * r, .05 + random() * .1, pick(), a * 1.2)
      }
      break
    case 2: // bass: broad, dense, low cloud
      for (let i = 0; i < 9; i++) at((i - 4) * .16, (random() - .5) * .18 + .08, .34 + random() * .2, color(i), a * .55)
      at(0, .06, .3, color(0), a * .9)
      break
    case 3: // guitar: curved filaments
      for (let f = 0; f < 3; f++) {
        const phase = random() * Math.PI, tilt = (f - 1) * .26
        for (let i = 0; i <= 34; i++) {
          const x = -.8 + i / 34 * 1.6
          at(x, tilt + Math.sin(x * 3 + phase) * .16, .07, color(f), a * .9)
        }
      }
      break
    case 4: // keys: regular rows, like a keyboard of light
      for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
        at((col - 3) * .21 + (random() - .5) * .08, (row - 1) * .24 + (random() - .5) * .08, .13, color(row + col), a * (row === 1 ? .85 : .6))
      }
      break
    case 5: // synth: two spiral arms
      for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 40; i++) {
        const t = i / 40 * Math.PI * 3, r = .06 + t / (Math.PI * 3) * .78, angle = t + arm * Math.PI
        at(Math.cos(angle) * r, Math.sin(angle) * r, .1 - i * .0015, color(arm + Math.floor(i / 8)), a * (1.1 - i / 50))
      }
      break
    case 6: // strings: long bowed streaks
      for (let s = 0; s < 5; s++) {
        const offset = (s - 2) * .17, bend = (random() - .5) * .2
        for (let i = 0; i <= 40; i++) {
          const u = -1 + i / 20, x = u * .82, y = offset + u * -.32 + bend * (1 - u * u)
          at(x, y, .065, color(s), a * .42)
        }
      }
      break
    case 7: // winds: wispy curls
      for (let c = 0; c < 3; c++) {
        const ox = (c - 1) * .38, oy = (random() - .5) * .4, turn = random() > .5 ? 1 : -1
        for (let i = 0; i < 30; i++) {
          const t = i / 30 * Math.PI * 2.4, r = .05 + i / 30 * .32
          at(ox + Math.cos(t * turn) * r, oy + Math.sin(t * turn) * r, .08 - i * .0015, color(c), a * (1 - i / 40))
        }
      }
      break
    default: // voice: bright core, halo and corona
      at(0, 0, .62, color(0), a * .55)
      at(0, 0, .28, color(1), a * 1.3)
      at(0, 0, .12, '#fff8ea', a * 1.4)
      for (let i = 0; i < 14; i++) {
        const t = i / 14 * Math.PI * 2
        for (let k = 1; k <= 4; k++) at(Math.cos(t) * (.28 + k * .12), Math.sin(t) * (.28 + k * .12), .05, color(i), a * (1 - k * .2))
      }
  }
  // Family texture: dust grain and star sparkles.
  for (let i = 0; i < texture.grain * (R / 64); i++) {
    const t = random() * Math.PI * 2, r = Math.sqrt(random()) * .9 * R
    g.fillStyle = rgba(pick(), .12 + random() * .2)
    g.fillRect(cx + Math.cos(t) * r, cy + Math.sin(t) * r, 1, 1)
  }
  for (let i = 0; i < texture.sparkle; i++) {
    const t = random() * Math.PI * 2, r = Math.sqrt(random()) * .78 * R
    blob(g, cx + Math.cos(t) * r, cy + Math.sin(t) * r, R * (.02 + random() * .025), '#fffaf0', .9 * intensity)
  }
  g.restore()
}

function fadeEdges(g: CanvasRenderingContext2D, size: number) {
  const mask = g.createRadialGradient(size / 2, size / 2, size * .18, size / 2, size / 2, size / 2)
  mask.addColorStop(0, 'rgba(0,0,0,1)')
  mask.addColorStop(1, 'rgba(0,0,0,0)')
  g.save()
  g.globalCompositeOperation = 'destination-in'
  g.fillStyle = mask
  g.fillRect(0, 0, size, size)
  g.restore()
}

function canvas(size: number) {
  const element = document.createElement('canvas')
  element.width = element.height = size
  return element
}

const urls = new Map<string, string>()

/** A single performer nebula as a cached data URL (bench tokens). */
export function nebulaUrl(spec: NebulaSpec, size = 96): string {
  const key = `${spec.family}:${spec.session}:${size}:${spec.colors.join()}`
  const cached = urls.get(key)
  if (cached) return cached
  const element = canvas(size)
  const g = element.getContext('2d')
  if (!g) return ''
  drawNebula(g, spec, size / 2, size / 2, size * .46, 1.5)
  fadeEdges(g, size)
  const url = element.toDataURL('image/png')
  urls.set(key, url)
  return url
}

/**
 * The staged nebulae merged into one system: each performer is a lobe around a shared
 * core, blended additively and dimmed with the crowd size so the mix stays harmonious.
 */
export function drawStage(target: HTMLCanvasElement, specs: NebulaSpec[]) {
  const size = target.width
  const g = target.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, size, size)
  if (!specs.length) return
  const n = specs.length, center = size / 2
  const intensity = Math.min(1, 1.25 / Math.sqrt(n))
  const orbit = n === 1 ? 0 : size * Math.min(.15, .06 + n * .012)
  specs.forEach((spec, index) => {
    const angle = index / n * Math.PI * 2 - Math.PI / 2
    g.save()
    g.translate(center + Math.cos(angle) * orbit, center + Math.sin(angle) * orbit)
    g.rotate(angle + Math.PI / 2)
    drawNebula(g, spec, 0, 0, size * (n === 1 ? .44 : .3), intensity)
    g.restore()
  })
  // A shared core mixes every staged color.
  g.save()
  g.globalCompositeOperation = 'lighter'
  const colors = specs.flatMap(spec => spec.colors.slice(0, 1))
  colors.forEach(color => blob(g, center, center, size * .2, color, .32 / Math.sqrt(colors.length)))
  blob(g, center, center, size * .05, '#fff8ea', .55)
  g.restore()
  // A soft pass melts the lobes into one body of gas.
  const copy = canvas(size)
  const c = copy.getContext('2d')
  if (c && 'filter' in c) {
    c.drawImage(target, 0, 0)
    g.save()
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = .55
    g.filter = `blur(${Math.round(size * .012)}px)`
    g.drawImage(copy, 0, 0)
    g.restore()
  }
  fadeEdges(g, size)
}
