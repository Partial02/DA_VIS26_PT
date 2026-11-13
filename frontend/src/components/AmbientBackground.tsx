import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { seededRandom, seedOf } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { useReducedMotion } from '../state/useReducedMotion'

const silver = ['#d9dce5', '#d9dce5', '#e2dfd6', '#bbc4d8', '#a39bc2', '#90b7bc']

export function AmbientBackground({ cover, exploring, drift }: { cover: boolean; exploring: boolean; drift: RefObject<{ depth: number }> }) {
  const { catalog } = useExperience()
  const reduced = useReducedMotion()
  const canvas = useRef<HTMLCanvasElement>(null)
  const followsPointer = !exploring
  const appearance = useRef({ cover, followsPointer })
  useEffect(() => {
    appearance.current.cover = cover
    appearance.current.followsPointer = followsPointer
  }, [cover, followsPointer])
  const stars = useMemo(() => {
    const random = seededRandom(761)
    return Array.from({ length: 1800 }, () => ({
      x: (random() - .5) * 3, y: (random() - .5) * 3, z: .5 + random() * 2,
      size: .35 + random() * .65, light: .12 + random() * .48, color: silver[Math.floor(random() * silver.length)],
    }))
  }, [])
  // One introductory spark per catalog track. This sphere stages the opening;
  // the interactive map uses its own tag-based spherical layout.
  const globe = useMemo(() => catalog.tracks.map(track => {
    const random = seededRandom(seedOf(track.id))
    const y = random() * 2 - 1, angle = random() * Math.PI * 2
    const radius = .88 + random() * .12, ring = Math.sqrt(1 - y * y)
    return { x: Math.cos(angle) * ring * radius, y: y * radius, z: Math.sin(angle) * ring * radius,
      size: .35 + random() * .65, light: .35 + random() * .6, color: silver[Math.floor(random() * silver.length)] }
  }), [catalog])
  useEffect(() => {
    const element = canvas.current!, context = element.getContext('2d')
    if (!context) return
    let width = 0, height = 0, frame = 0, lastTime = 0, elapsed = 0
    let globeOpacity = appearance.current.cover ? 1 : 0
    const pointer = { x: 0, y: 0 }, look = { x: 0, y: 0 }
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight
      const dpr = Math.min(devicePixelRatio, 1.5)
      element.width = Math.round(width * dpr); element.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointer.x = event.clientX / width * 2 - 1
      pointer.y = event.clientY / height * 2 - 1
    }
    const reset = () => { pointer.x = 0; pointer.y = 0 }
    const projectGlobe = (x: number, y: number, z: number) => {
      const yaw = elapsed * .035 + look.x * .12, pitch = look.y * .08
      const rx = x * Math.cos(yaw) + z * Math.sin(yaw)
      const rz = z * Math.cos(yaw) - x * Math.sin(yaw)
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch)
      const depth = rz * Math.cos(pitch) + y * Math.sin(pitch)
      const radius = Math.min(width * .32, height * .41), scale = 3.6 / (3.6 - depth)
      return { x: width * (width < 650 ? .62 : .69) + rx * radius * scale,
        y: height * .5 + ry * radius * scale, depth, scale }
    }
    const render = (now: number) => {
      frame = requestAnimationFrame(render)
      if (document.hidden || now - lastTime < (reduced ? 100 : 30)) return
      const delta = Math.min((now - (lastTime || now)) / 1000, .05)
      lastTime = now
      if (!reduced) elapsed += delta
      const follow = 1 - Math.exp(-delta * 4)
      if (reduced || !appearance.current.followsPointer) { look.x = 0; look.y = 0 }
      else {
        look.x += (pointer.x - look.x) * follow
        look.y += (pointer.y - look.y) * follow
      }
      globeOpacity += ((appearance.current.cover ? 1 : 0) - globeOpacity) * (reduced ? 1 : follow)
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'lighter'
      for (const star of stars) {
        const depth = .5 + ((star.z - .5 - drift.current.depth) % 2 + 2) % 2
        const x = width / 2 + (star.x - look.x * .055) / depth * width
        const y = height / 2 + (star.y - look.y * .035) / depth * height
        context.globalAlpha = star.light * (1 - globeOpacity * .65)
        context.fillStyle = star.color
        context.fillRect(x, y, star.size, star.size)
      }
      if (globeOpacity > .005) {
        for (const star of globe) {
          const point = projectGlobe(star.x, star.y, star.z)
          context.globalAlpha = globeOpacity * star.light * (point.depth > 0 ? .95 : .24)
          context.fillStyle = star.color
          const size = star.size * point.scale
          context.fillRect(point.x, point.y, size, size)
        }
        // Short, curved signals skim the sphere without connecting data points.
        if (!reduced) for (let signal = 0; signal < 6; signal++) {
          const head = elapsed * (.18 + signal * .008) + signal * 1.13
          for (let step = 0; step < 50; step++) {
            const angle = head - step * .0035, tilt = signal * 1.7
            const point = projectGlobe(Math.cos(angle), Math.sin(angle) * Math.cos(tilt), Math.sin(angle) * Math.sin(tilt))
            if (point.depth < -.1) continue
            context.globalAlpha = globeOpacity * (1 - step / 50) * .8
            context.fillStyle = step < 3 ? '#f1ede3' : silver[3 + signal % 3]
            context.fillRect(point.x, point.y, step < 3 ? 1.5 : 1, step < 3 ? 1.5 : 1)
          }
        }
      }
      if (!reduced) for (let meteor = 0; meteor < 3; meteor++) {
        const phase = (elapsed + meteor * 3.9) % 12
        if (phase > 2.3) continue
        const progress = phase / 2.3, fade = Math.sin(progress * Math.PI) * (1 - globeOpacity * .8)
        for (let step = 0; step < 45; step++) {
          const t = progress - step * .003
          const x = width * (.15 + meteor * .28 + t * .22)
          const y = height * (.1 + meteor * .19 + t * .12 + t * t * .06)
          context.globalAlpha = fade * (1 - step / 45) * .7
          context.fillStyle = step < 3 ? '#eeece4' : silver[3 + meteor]
          context.fillRect(x, y, step < 3 ? 1.7 : 1, step < 3 ? 1.7 : 1)
        }
      }
      context.globalAlpha = 1
    }
    resize(); frame = requestAnimationFrame(render)
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    window.addEventListener('pointermove', move); window.addEventListener('blur', reset)
    document.documentElement.addEventListener('pointerleave', reset)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect()
      window.removeEventListener('pointermove', move); window.removeEventListener('blur', reset)
      document.documentElement.removeEventListener('pointerleave', reset)
    }
  }, [stars, globe, reduced, drift])
  return <div className="ambient" aria-hidden="true">
    <div className="nebula" /><canvas ref={canvas} /><div className="grain" />
  </div>
}
