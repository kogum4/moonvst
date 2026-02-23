import { describe, expect, test } from 'vitest'
import { createDefaultGraphState } from './graphReducer'
import { createGraphHistoryState, graphHistoryReducer } from './graphHistory'

describe('graph history reducer', () => {
  test('tracks graph edits and supports undo/redo', () => {
    let history = createGraphHistoryState()
    history = graphHistoryReducer(history, {
      type: 'graph',
      trackHistory: true,
      action: { type: 'addNode', kind: 'chorus', x: 220, y: 120, id: 'fx-1' },
    })

    expect(history.present.nodes.some((node) => node.id === 'fx-1')).toBe(true)
    expect(history.past).toHaveLength(1)

    history = graphHistoryReducer(history, { type: 'undo' })
    expect(history.present.nodes.some((node) => node.id === 'fx-1')).toBe(false)
    expect(history.future).toHaveLength(1)

    history = graphHistoryReducer(history, { type: 'redo' })
    expect(history.present.nodes.some((node) => node.id === 'fx-1')).toBe(true)
    expect(history.future).toHaveLength(0)
  })

  test('reset is undoable', () => {
    let history = createGraphHistoryState()
    history = graphHistoryReducer(history, {
      type: 'graph',
      trackHistory: true,
      action: { type: 'addNode', kind: 'delay', x: 240, y: 140, id: 'fx-delay' },
    })

    history = graphHistoryReducer(history, { type: 'reset' })
    expect(history.present.nodes.map((node) => node.id)).toEqual(['input', 'output'])

    history = graphHistoryReducer(history, { type: 'undo' })
    expect(history.present.nodes.some((node) => node.id === 'fx-delay')).toBe(true)
  })

  test('replace can be non-historic for initial hydration', () => {
    const restored = createDefaultGraphState()
    restored.nodes.push({
      id: 'fx-2',
      kind: 'reverb',
      x: 320,
      y: 220,
      bypass: false,
      params: { mix: 40 },
    })

    const history = graphHistoryReducer(createGraphHistoryState(), {
      type: 'replace',
      state: restored,
      trackHistory: false,
    })

    expect(history.past).toHaveLength(0)
    expect(history.present.nodes.some((node) => node.id === 'fx-2')).toBe(true)
  })
})
