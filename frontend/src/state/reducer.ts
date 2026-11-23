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
  /** Genre and session chips of the two-step picker; the selection holds their cross product. */
  pickedGenres: string[]
  pickedSessions: number[]
}

export type Action =
  | { type: 'navigate'; destination: Destination }
  | { type: 'arrive'; transition: number }
  | { type: 'selectTrack'; id: string }
  | { type: 'toggleCell'; id: number }
  /** Pick every given cell, or drop them all when every one is already picked. */
  | { type: 'toggleCells'; ids: number[] }
  /**
   * Toggle one picker chip. `line` is every cell of its row (genre chip) or column (session chip).
   * Turning it on picks the cells that pair with the other dimension's chips; off drops the whole line.
   */
  | { type: 'pickChip'; chip: { genreId: string } | { session: number }; line: { id: number; genreId: string; session: number }[] }
  | { type: 'clearSelection' }

export const initialState: ExperienceState = {
  view: { level: 'universe' }, transition: 0, arrivedTransition: 0,
  selectedTrackId: null, visits: {}, genreVisits: {}, arrivedGenreId: null, history: [], selection: [], pickedGenres: [], pickedSessions: [],
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
    case 'pickChip': {
      const { chip, line } = action
      const on = 'genreId' in chip ? !state.pickedGenres.includes(chip.genreId) : !state.pickedSessions.includes(chip.session)
      const ids = (on ? line.filter(cell => 'genreId' in chip ? state.pickedSessions.includes(cell.session) : state.pickedGenres.includes(cell.genreId)) : line)
        .map(cell => cell.id)
      const selection = on ? [...state.selection, ...ids.filter(id => !state.selection.includes(id))]
        : state.selection.filter(id => !ids.includes(id))
      if ('genreId' in chip) return { ...state, selection,
        pickedGenres: on ? [...state.pickedGenres, chip.genreId] : state.pickedGenres.filter(id => id !== chip.genreId) }
      return { ...state, selection,
        pickedSessions: on ? [...state.pickedSessions, chip.session] : state.pickedSessions.filter(s => s !== chip.session) }
    }
    case 'clearSelection':
      if (!state.selection.length && !state.pickedGenres.length && !state.pickedSessions.length) return state
      return { ...state, selection: [], pickedGenres: [], pickedSessions: [] }
  }
}
