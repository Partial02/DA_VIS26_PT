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
  /** Picked genre × session cells (category indices), in the order they were picked. */
  selection: number[]
}

export type Action =
  | { type: 'navigate'; destination: Destination }
  | { type: 'arrive'; transition: number }
  | { type: 'selectTrack'; id: string }
  | { type: 'toggleCell'; id: number }
  /** Pick every given cell, or drop them all when every one is already picked. */
  | { type: 'toggleCells'; ids: number[] }
  | { type: 'clearSelection' }

export const initialState: ExperienceState = {
  view: { level: 'universe' }, transition: 0, arrivedTransition: 0,
  selectedTrackId: null, visits: {}, genreVisits: {}, arrivedGenreId: null, history: [], selection: [],
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
    case 'toggleCell':
      return { ...state, selection: state.selection.includes(action.id)
        ? state.selection.filter(id => id !== action.id) : [...state.selection, action.id] }
    case 'toggleCells': {
      if (!action.ids.length) return state
      const all = action.ids.every(id => state.selection.includes(id))
      return { ...state, selection: all ? state.selection.filter(id => !action.ids.includes(id))
        : [...state.selection, ...action.ids.filter(id => !state.selection.includes(id))] }
    }
    case 'clearSelection':
      if (!state.selection.length) return state
      return { ...state, selection: [] }
  }
}
