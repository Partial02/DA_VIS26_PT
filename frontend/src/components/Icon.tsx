const paths = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevron: 'm6 9 6 6 6-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  close: 'm6 6 12 12M6 18 18 6',
  list: 'M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01',
  mix: 'M5 3v7m0 4v7M12 3v12m0 4v2M19 3v2m0 4v12M2 10h6m1 5h6m1-10h6',
  map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5m6-2v16m6-14v16',
  music: 'M9 18V5l11-2v13M9 9l11-2M9 18c0 2-6 3-6 0s6-3 6 0m11-2c0 2-6 3-6 0s6-3 6 0',
  star: 'm12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z',
  history: 'M3 11a9 9 0 1 1 2.6 7M3 4v7h7m2-4v5l3 2',
  plus: 'M12 5v14M5 12h14',
  stage: 'M12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0M3 12c0-2.5 4-4.5 9-4.5s9 2 9 4.5-4 4.5-9 4.5-9-2-9-4.5ZM6.5 5.5l.01 0M18 18.5l.01 0',
  play: 'M8 5.5v13l10-6.5Z',
  pause: 'M9 5v14M15 5v14',
  key: 'M14.5 9.5a4 4 0 1 0-3.2 3.9L13 15h2v2h2v2h3v-3l-5.6-5.6c.07-.3.1-.6.1-.9ZM8.5 8.5h.01',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
}
export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
