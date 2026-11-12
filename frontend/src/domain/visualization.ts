import { seededRandom, seedOf } from './catalog.ts'

// Real audio can supply live levels here without changing the visualizer UI.
export interface VisualizationSignal {
  source: 'demo' | 'audio'
  levels: readonly number[]
}

export function createDemoSignal(trackId: string): VisualizationSignal {
  const random = seededRandom(seedOf(trackId))
  return { source: 'demo', levels: Array.from({ length: 40 }, () => .12 + random() * .88) }
}
