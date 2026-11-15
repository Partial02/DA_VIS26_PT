// Performer orbs: a liquid-glass sphere holding a smooth cosmic swirl.
// The family sets the swirl colors (its genres' palette colors); the session
// sets the swirl's shape (arm count and turn). The stage pours every staged
// swirl into one larger glass flask; the 3D system reuses the swirl alone.
import type { Atlas } from '../domain/atlas'
import type { Catalog } from '../domain/catalog'

export interface NebulaSpec {
  family: number
  session: number
  colors: string[]
}

export function performerSpec(atlas: Atlas, catalog: Catalog, performerId: number): NebulaSpec {
  const performer = atlas.performers[performerId]
  const colors = atlas.model.families[performer.family].genreIds.map(id => catalog.genreById.get(id)!.color)
  return { family: performer.family, session: performer.session, colors: colors.length > 1 ? colors : [colors[0], '#f7f2e4'] }
}

function rgba(hex: string, alpha: number) {
  const value = parseInt(hex.slice(1, 7), 16)
  return `rgba(${value >> 16 & 255},${value >> 8 & 255},${value & 255},${Math.max(0, Math.min(1, alpha))})`
}

function canvas(size: number) {
  const element = document.createElement('canvas')
  element.width = element.height = size
  return element
}

/** One smooth swirl arm: a tapering, blurred spiral stroke. */
function arm(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, start: number, turn: number, color: string, alpha: number) {
  const steps = 48
  for (let i = 0; i < steps; i++) {
    const t = i / steps, t2 = (i + 1) / steps
    const a1 = start + t * turn, a2 = start + t2 * turn
    const r1 = R * (.08 + t * .78), r2 = R * (.08 + t2 * .78)
    g.strokeStyle = rgba(color, alpha * .22 * (1 - t * .7))
    g.lineWidth = R * (.26 - t * .2)
    g.beginPath()
    g.moveTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1)
    g.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2)
    g.stroke()
  }
}

/** The colored swirl, clipped to a circle of radius R. */
function drawSwirl(g: CanvasRenderingContext2D, arms: { color: string; start: number; turn: number }[], cx: number, cy: number, R: number, alpha: number) {
  g.save()
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip()
  g.globalCompositeOperation = 'screen'
  g.lineCap = 'round'
  if ('filter' in g) g.filter = `blur(${Math.max(1, R * .09)}px)`
  for (const a of arms) arm(g, cx, cy, R, a.start, a.turn, a.color, alpha)
  g.filter = 'none'
  // Bright, quiet core.
  const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * .2)
  core.addColorStop(0, 'rgba(255,250,240,.6)')
  core.addColorStop(1, 'rgba(255,250,240,0)')
  g.fillStyle = core
  g.fillRect(cx - R, cy - R, R * 2, R * 2)
  g.restore()
}

/** Liquid-glass shell: dark tinted body, refracted rim, top highlight. */
function drawGlass(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, tint: string) {
  g.save()
  const body = g.createRadialGradient(cx, cy - R * .2, R * .2, cx, cy, R)
  body.addColorStop(0, 'rgba(20,18,32,0)')
  body.addColorStop(.75, 'rgba(255,255,255,.03)')
  body.addColorStop(.93, rgba(tint, .22))
  body.addColorStop(1, 'rgba(255,255,255,.42)')
  g.fillStyle = body
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill()
  g.lineWidth = Math.max(1, R * .025)
  g.strokeStyle = 'rgba(255,255,255,.38)'
  g.stroke()
  // Specular highlight, upper left.
  const hx = cx - R * .38, hy = cy - R * .48
  const shine = g.createRadialGradient(hx, hy, 0, hx, hy, R * .42)
  shine.addColorStop(0, 'rgba(255,255,255,.55)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = shine
  g.beginPath(); g.ellipse(hx, hy, R * .36, R * .2, -.6, 0, Math.PI * 2); g.fill()
  // Colored bounce light, lower right.
  g.strokeStyle = rgba(tint, .55)
  g.lineWidth = Math.max(1, R * .04)
  g.beginPath(); g.arc(cx, cy, R * .9, Math.PI * .1, Math.PI * .55); g.stroke()
  g.restore()
}

function performerArms(spec: NebulaSpec) {
  const count = 1 + spec.session % 3
  const turn = Math.PI * (1.2 + (spec.session % 4) * .25) * (spec.session % 2 ? -1 : 1)
  const base = spec.session * .7 + spec.family * 1.3
  return Array.from({ length: count + 1 }, (_, i) => ({
    color: spec.colors[i % spec.colors.length], start: base + i / (count + 1) * Math.PI * 2, turn,
  }))
}

const urls = new Map<string, string>()

/** A single performer orb as a cached data URL (bench tokens). */
export function nebulaUrl(spec: NebulaSpec, size = 96): string {
  const key = `${spec.family}:${spec.session}:${size}:${spec.colors.join()}`
  const cached = urls.get(key)
  if (cached) return cached
  const element = canvas(size)
  const g = element.getContext('2d')
  if (!g) return ''
  const c = size / 2, R = size * .44
  drawSwirl(g, performerArms(spec), c, c, R * .96, .7)
  drawGlass(g, c, c, R, spec.colors[0])
  const url = element.toDataURL('image/png')
  urls.set(key, url)
  return url
}

/**
 * Every staged swirl poured into one flask: each performer adds its arms around a
 * shared core, dimmed with the crowd size so the colors blend instead of clashing.
 */
export function drawStage(target: HTMLCanvasElement, specs: NebulaSpec[], glass = true) {
  const size = target.width
  const g = target.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, size, size)
  const c = size / 2, R = size * .45
  if (specs.length) {
    const n = specs.length
    const arms = specs.flatMap((spec, index) => spec.colors.slice(0, 2).map((color, k) => ({
      color, start: index / n * Math.PI * 2 + k * Math.PI, turn: Math.PI * 1.5,
    })))
    drawSwirl(g, arms, c, c, R * .97, Math.min(.8, 1.2 / Math.sqrt(n)))
  }
  if (glass) drawGlass(g, c, c, R, specs[0]?.colors[0] ?? '#a999dc')
}
