// One pattern per session (instrument family). In the selection table the pattern
// is drawn in the genre's color, so every cell is genre color × session pattern.
const glyphs: Record<string, string> = {
  drums: 'M3 5.5a5 2 0 1 0 10 0a5 2 0 1 0-10 0M3 5.5v5a5 2 0 0 0 10 0v-5',
  beats: 'M3 3h3.5v3.5H3zM9.5 3H13v3.5H9.5zM3 9.5h3.5V13H3zM9.5 9.5H13V13H9.5z',
  percussion: 'M3 4h.01M8 2.8h.01M13 4.5h.01M5.2 8.2h.01M10.8 8h.01M3.4 12.6h.01M8.2 13.2h.01M12.8 12.2h.01',
  bass: 'M2 5.5h12M2 10.5h12',
  electric_guitar: 'M2 11 5 5l3 6 3-6 3 6',
  acoustic_guitar: 'M5 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0M2 8h3M11 8h3',
  piano: 'M2.5 3h11v10h-11zM6.2 3v10M9.8 3v10M5 3v5M8 3v5M11 3v5',
  keys: 'M2.5 2.5h5v5h-5zM8.5 8.5h5v5h-5z',
  synth: 'M2 8c1-4.5 2-4.5 3 0s2 4.5 3 0 2-4.5 3 0 2 4.5 3 0',
  strings: 'M2 14 14 2M2 9l7-7M7 14l7-7',
  brass: 'M3 4.5l5 4 5-4M3 9.5l5 4 5-4',
  woodwind: 'M2 6h12v4H2zM5 8h.01M8 8h.01M11 8h.01',
  mallets: 'M3.5 3v10M6.5 4v8M9.5 5v6M12.5 6v4',
  folk_reed: 'M3 2.5h10M3 13.5h10M4 2.5l8 2.75-8 2.75 8 2.75-8 2.75',
  ethnic: 'M8 2l6 6-6 6-6-6zM8 5.5 10.5 8 8 10.5 5.5 8z',
  vocal: 'M3 8h.01M5.8 5.8a3.2 3.2 0 0 1 0 4.4M8.6 3.8a6 6 0 0 1 0 8.4M11.4 1.9a8.7 8.7 0 0 1 0 12.2',
}

const heavy = new Set(['bass', 'mallets', 'percussion', 'woodwind', 'vocal'])

export function SessionGlyph({ session, size = 16, className }: { session: string; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth={heavy.has(session) ? 2 : 1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={glyphs[session] ?? glyphs.drums} />
  </svg>
}
