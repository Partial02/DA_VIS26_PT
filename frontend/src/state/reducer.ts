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
  /** Genres opened in the picker (their instrument bubbles are shown), in the order they were opened. */
  pickedGenres: string[]
}

export type Action =
  | { type: 'navigate'; destination: Destination }
  | { type: 'arrive'; transition: number }
  | { type: 'selectTrack'; id: string }
  | { type: 'toggleCell'; id: number }
  /** Pick every given cell, or drop them all when every one is already picked. */
  | { type: 'toggleCells'; ids: number[] }
  /**
   * Open a genre's bubbles, or close it when it is open (picked, or holding picked cells):
   * closing drops every cell of its row (`rowIds`).
   */
  | { type: 'pickGenre'; genreId: string; rowIds: number[] }
  | { type: 'clearSelection' }

export const initialState: ExperienceState = {
  view: { level: 'universe' }, transition: 0, arrivedTransition: 0,
  selectedTrackId: null, visits: {}, genreVisits: {}, arrivedGenreId: null, history: [], selection: [], pickedGenres: [],
}

export function experienceReducer(state: ExperienceState, action: Action): ExperienceState {
  switch (action.type) {
    case 'navigate':
      if (JSON.stringify(state.view) === JSON.stringify(action.destination)) return state
      return { ...state, view: action.destination, selectedTrackId: null, transition: state.transition + 1 }
    case 'arrive': {
      if (action.transition !== state.transition || state.arrivedTransition === action.transition) return state
      const genreId = state.view.level === 'universe' ? null : state.view.genreId
      // A genre visit counts on entering the genre from elsewhere and on every subgenre arrival
      // (moving between its subgenres or landing from a recommendation); only stepping up from a
      // subgenre to its own genre view does not count.
      const countsGenre = genreId && (genreId !== state.arrivedGenreId || state.view.level === 'system')
      const genreVisits = countsGenre
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
    case 'pickGenre': {
      const open = state.pickedGenres.includes(action.genreId) || action.rowIds.some(id => state.selection.includes(id))
      if (!open) return { ...state, pickedGenres: [...state.pickedGenres, action.genreId] }
      return { ...state, pickedGenres: state.pickedGenres.filter(id => id !== action.genreId),
        selection: state.selection.filter(id => !action.rowIds.includes(id)) }
    }
    case 'clearSelection':
      if (!state.selection.length && !state.pickedGenres.length) return state
      return { ...state, selection: [], pickedGenres: [] }
  }
}
