import { describe, expect, test, vi } from 'vitest'
import { createDefaultGraphState, graphReducer } from '../state/graphReducer'
import { createGraphRuntimeBridge } from './graphRuntimeBridge'

describe('showcase graph runtime bridge', () => {
  test('emits serialized graph payload only when graph changes', () => {
    const emit = vi.fn<(payload: string) => void>()
    const bridge = createGraphRuntimeBridge(emit)

    let state = createDefaultGraphState()
    bridge.sync(state)
    bridge.sync(state)
    expect(emit).toHaveBeenCalledTimes(1)

    state = graphReducer(state, { type: 'addNode', kind: 'chorus', x: 240, y: 200, id: 'fx-1' })
    bridge.sync(state)
    expect(emit).toHaveBeenCalledTimes(2)
    expect(() => JSON.parse(emit.mock.calls[1]?.[0] ?? '')).not.toThrow()
  })
})
