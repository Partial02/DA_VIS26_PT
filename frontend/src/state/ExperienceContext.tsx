import { createContext, useContext, useMemo, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Catalog } from '../domain/catalog'
import { experienceReducer, initialState } from './reducer'
import type { Action, ExperienceState } from './reducer'

const Context = createContext<{ catalog: Catalog; state: ExperienceState; dispatch: Dispatch<Action> } | null>(null)

export function ExperienceProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const [state, dispatch] = useReducer(experienceReducer, initialState)
  const value = useMemo(() => ({ catalog, state, dispatch }), [catalog, state])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useExperience() {
  const context = useContext(Context)
  if (!context) throw new Error('ExperienceProvider is required')
  return context
}
