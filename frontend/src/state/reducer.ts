import type { LineupChange } from '../domain/atlas.ts'

export type Destination =
  | { level: 'universe' }
  | { level: 'genre'; genreId: string }
  | { level: 'system'; genreId: string; subgenreId: string }

export interface ExperienceState {
  view: Destination
  transition: number
  arrivedTransition: number
  selectedTrackId: string | null
  visits: Record<string, number>
  genreVisits: Record<string, number>
  arrivedGenreId: string | null
  history: string[]
  /** Genre Atlas performer ids on stage, in the order they were added. */
  stage: number[]
  /** The last automatic lineup change made by choosing a recommendation. */
  lineupChange: LineupChange | null
}

export type Action =
  | { type: 'navigate'; destination: Destination }
  | { type: 'arrive'; transition: number }
  | { type: 'selectTrack'; id: string }
  | { type: 'togglePerformer'; id: number }
  | { type: 'clearStage' }
  | { type: 'setLineup'; stage: number[]; change: LineupChange }

export const initialState: ExperienceState = {
  view: { level: 'universe' }, transition: 0, arrivedTransition: 0,
  selectedTrackId: null, visits: {}, genreVisits: {}, arrivedGenreId: null, history: [], stage: [], lineupChange: null,
}

export function experienceReducer(state: ExperienceState, action: Action): ExperienceState {
  switch (action.type) {
    case 'navigate':
      if (JSON.stringify(state.view) === JSON.stringify(action.destination)) return state
      return { ...state, view: action.destination, selectedTrackId: null, transition: state.transition + 1 }
    case 'arrive': {
      if (action.transition !== state.transition || state.arrivedTransition === action.transition) return state
      const genreId = state.view.level === 'universe' ? null : state.view.genreId
      const genreVisits = genreId && genreId !== state.arrivedGenreId
        ? { ...state.genreVisits, [genreId]: (state.genreVisits[genreId] ?? 0) + 1 } : state.genreVisits
      const arrived = { ...state, arrivedTransition: action.transition, genreVisits, arrivedGenreId: genreId }
      if (state.view.level !== 'system') return arrived
      const id = state.view.subgenreId
      return { ...arrived,
        visits: { ...state.visits, [id]: (state.visits[id] ?? 0) + 1 }, history: [...state.history, id] }
    }
    case 'selectTrack':
      return { ...state, selectedTrackId: action.id }
    case 'togglePerformer':
      return { ...state, lineupChange: null, stage: state.stage.includes(action.id)
        ? state.stage.filter(id => id !== action.id) : [...state.stage, action.id] }
    case 'clearStage':
      if (!state.stage.length && !state.lineupChange) return state
      return { ...state, stage: [], lineupChange: null }
    case 'setLineup':
      return { ...state, stage: action.stage, lineupChange: action.change }
  }
}
