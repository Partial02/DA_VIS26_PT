import { initialPreferences, pairKey } from '../domain/recommendations.ts'
import type { PreferencePair } from '../domain/recommendations.ts'

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
  preferences: PreferencePair[]
}

export type Action =
  | { type: 'navigate'; destination: Destination }
  | { type: 'arrive'; transition: number }
  | { type: 'selectTrack'; id: string }
  | { type: 'addPair'; pair: PreferencePair }
  | { type: 'removePair'; key: string }
  | { type: 'weight'; key: string; weight: number }

export const initialState: ExperienceState = {
  view: { level: 'universe' }, transition: 0, arrivedTransition: 0,
  selectedTrackId: null, visits: {}, genreVisits: {}, arrivedGenreId: null, history: [], preferences: initialPreferences,
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
    case 'addPair':
      if (state.preferences.some(p => pairKey(p) === pairKey(action.pair))) return state
      return { ...state, preferences: [...state.preferences, action.pair] }
    case 'removePair':
      return { ...state, preferences: state.preferences.filter(p => pairKey(p) !== action.key) }
    case 'weight':
      return { ...state, preferences: state.preferences.map(p => pairKey(p) === action.key ?
        { ...p, weight: Math.min(100, Math.max(0, action.weight)) } : p) }
  }
}
