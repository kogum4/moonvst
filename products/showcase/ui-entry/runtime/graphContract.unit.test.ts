import { describe, expect, test } from 'vitest'
import { createDefaultGraphState, graphReducer } from '../state/graphReducer'
import {
  GRAPH_CONTRACT_SCHEMA_VERSION,
  deserializeGraphPayload,
  serializeGraphPayload,
} from './graphContract'

describe('showcase graph contract payload', () => {
  test('serializes graph payload deterministically with schema version', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'delay', x: 320, y: 220, id: 'fx-z' })
    state = graphReducer(state, { type: 'addNode', kind: 'chorus', x: 200, y: 220, id: 'fx-a' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-a' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-a', toNodeId: 'fx-z' })

    const payload = serializeGraphPayload(state)
    const decoded = JSON.parse(payload) as {
      graphSchemaVersion: number
      nodes: Array<{ id: string }>
      edges: Array<{ fromNodeId: string; toNodeId: string }>
    }

    expect(decoded.graphSchemaVersion).toBe(GRAPH_CONTRACT_SCHEMA_VERSION)
    expect(decoded.nodes.map((node) => node.id)).toEqual(['fx-a', 'fx-z', 'input', 'output'])
    expect(decoded.edges).toEqual([
      { fromNodeId: 'fx-a', toNodeId: 'fx-z' },
      { fromNodeId: 'input', toNodeId: 'fx-a' },
      { fromNodeId: 'input', toNodeId: 'output' },
    ])
  })

  test('rejects unsupported schema version during deserialize', () => {
    const unsupported = JSON.stringify({
      graphSchemaVersion: 999,
      nodes: [],
      edges: [],
    })
    expect(() => deserializeGraphPayload(unsupported)).toThrow('ERR_UNSUPPORTED_SCHEMA_VERSION')
  })
})
