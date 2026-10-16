import { useSyncExternalStore } from 'react'
import { loadState, saveState, type AppState } from './storage/store'

// App-wide state: loaded once, every change is persisted through the storage layer.
let state: AppState = loadState()
const listeners = new Set<() => void>()

export function getState(): AppState {
  return state
}

export function update(fn: (s: AppState) => AppState): void {
  const next = fn(state)
  if (next === state) return
  state = next
  saveState(state)
  listeners.forEach((l) => l())
}

export function useAppState(): AppState {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getState)
}
