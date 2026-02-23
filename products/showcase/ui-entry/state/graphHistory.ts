import { createDefaultGraphState, graphReducer } from './graphReducer'
import type { GraphAction, GraphState } from './graphTypes'

export interface GraphHistoryState {
  past: GraphState[]
  present: GraphState
  future: GraphState[]
}

export type GraphHistoryAction =
  | { type: 'graph'; action: GraphAction; trackHistory?: boolean }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset' }
  | { type: 'replace'; state: GraphState; trackHistory?: boolean }

const HISTORY_LIMIT = 200

const normalizeState = (state: GraphState): GraphState => ({
  ...state,
  selectedNodeId: state.nodes.some((node) => node.id === state.selectedNodeId) ? state.selectedNodeId : null,
  lastError: null,
})

const pushPast = (past: GraphState[], next: GraphState): GraphState[] => {
  const combined = [...past, next]
  if (combined.length <= HISTORY_LIMIT) {
    return combined
  }
  return combined.slice(combined.length - HISTORY_LIMIT)
}

export function createGraphHistoryState(initial?: GraphState): GraphHistoryState {
  return {
    past: [],
    present: normalizeState(initial ?? createDefaultGraphState()),
    future: [],
  }
}

export function graphHistoryReducer(state: GraphHistoryState, action: GraphHistoryAction): GraphHistoryState {
  switch (action.type) {
    case 'graph': {
      const nextPresent = normalizeState(graphReducer(state.present, action.action))
      if (!action.trackHistory && nextPresent === state.present) {
        return { ...state, present: nextPresent }
      }
      if (!action.trackHistory) {
        return { ...state, present: nextPresent }
      }
      if (nextPresent === state.present) {
        return state
      }
      return {
        past: pushPast(state.past, state.present),
        present: nextPresent,
        future: [],
      }
    }

    case 'undo': {
      const previous = state.past[state.past.length - 1]
      if (!previous) {
        return state
      }
      return {
        past: state.past.slice(0, -1),
        present: normalizeState(previous),
        future: [state.present, ...state.future],
      }
    }

    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) {
        return state
      }
      return {
        past: pushPast(state.past, state.present),
        present: normalizeState(next),
        future: rest,
      }
    }

    case 'reset': {
      const nextPresent = createDefaultGraphState({ nodeLimit: state.present.nodeLimit })
      return {
        past: pushPast(state.past, state.present),
        present: normalizeState(nextPresent),
        future: [],
      }
    }

    case 'replace': {
      const nextPresent = normalizeState(action.state)
      if (!action.trackHistory) {
        return {
          ...state,
          present: nextPresent,
          future: [],
        }
      }
      return {
        past: pushPast(state.past, state.present),
        present: nextPresent,
        future: [],
      }
    }
  }
}
