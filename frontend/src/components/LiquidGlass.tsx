// SVG liquid glass (after sanyi-dalmadi's "SVG Liquid Glass" pen).
// A quadrant color map (R = x, G = y) is blurred into a smooth displacement field and
// used as `backdrop-filter: url(#id)`, so whatever lies behind the element bends at
// its rim like a thick glass lens. Chromium renders SVG backdrop filters; other
// browsers get a frosted blur with the same tint and inset light.
import { createElement, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'

const svgFilterBackdrop = typeof navigator !== 'undefined' && /Chrome|Chromium|Edg\//.test(navigator.userAgent) && !/Firefox/.test(navigator.userAgent)

interface Size { width: number; height: number; radius: number }

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0, radius: 0 })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const width = Math.round(element.offsetWidth), height = Math.round(element.offsetHeight)
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0
      setSize(previous => previous.width === width && previous.height === height && previous.radius === radius ? previous : { width, height, radius })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}

function GlassFilter({ id, width, height, radius, strength }: Size & { id: string; strength: number }) {
  if (!width || !height) return null
  const short = Math.min(width, height)
  // The pen's constants (blur 50, scale 40) suit a 384 × 128 card; shrink them for small glass.
  const spread = Math.min(50, short * .35)
  const scale = Math.min(40, short * .3) * strength
  const box = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${height}px"><rect width="${width}px" height="${height}px" rx="${radius}" ry="${radius}" fill="black" /></svg>`
  const quadrants = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${height}px"><rect x="0" y="0" width="50%" height="50%" fill="black" /><rect x="50%" y="50%" width="50%" height="50%" fill="yellow" /><rect x="0" y="50%" width="50%" height="50%" fill="green" /><rect x="50%" y="0" width="50%" height="50%" fill="red" /></svg>`
  return <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    <defs>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feImage href={`data:image/svg+xml;utf8,${encodeURIComponent(box)}`} x="0" y="0" width={width} height={height} result="box" />
        <feImage href={`data:image/svg+xml;utf8,${encodeURIComponent(quadrants)}`} x={width * -.5} y={height * -.5} width={width * 2} height={height * 2} result="border-tex" />
        <feGaussianBlur stdDeviation={spread} />
        <feComponentTransfer result="dispMap">
          <feFuncA type="discrete" tableValues="0 1 1 1 1 1 1 1 1" />
        </feComponentTransfer>
        <feDisplacementMap in="SourceGraphic" in2="dispMap" scale={scale} xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation={Math.max(2, Math.min(5, short / 40))} />
      </filter>
    </defs>
  </svg>
}

type GlassTag = 'div' | 'section' | 'aside' | 'nav' | 'button' | 'dialog'

export interface LiquidGlassProps extends HTMLAttributes<HTMLElement> {
  as?: GlassTag
  children?: ReactNode
  /** Refraction strength multiplier; 1 matches the pen. */
  strength?: number
  /** Extra color tint mixed into the glass (e.g. a genre color). */
  tint?: string
  elementRef?: Ref<HTMLElement>
  [data: `data-${string}`]: unknown
}

export function LiquidGlass({ as = 'div', className, style, children, strength = 1, tint, elementRef, ...rest }: LiquidGlassProps) {
  const [ref, size] = useElementSize<HTMLElement>()
  const id = `lg-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const glassStyle: CSSProperties = {
    ...style,
    backdropFilter: svgFilterBackdrop && size.width ? `url(#${id}) saturate(1.35)` : 'blur(14px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
    ...(tint ? { '--glass-tint': tint } as CSSProperties : {}),
  }
  const setRef = (element: HTMLElement | null) => {
    ref.current = element
    if (typeof elementRef === 'function') elementRef(element)
    else if (elementRef) (elementRef as { current: HTMLElement | null }).current = element
  }
  return createElement(as, { ...rest, ref: setRef, className: `liquidGlass ${className ?? ''}`, style: glassStyle, 'data-tinted': tint ? true : undefined },
    children,
    svgFilterBackdrop && <GlassFilter id={id} {...size} strength={strength} />)
}
