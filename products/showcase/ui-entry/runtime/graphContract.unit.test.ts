import { describe, expect, test } from 'vitest'
import { createDefaultGraphState, graphReducer } from '../state/graphReducer'
import {
  compileRuntimeGraphPayload,
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

  test('compiles runtime payload with effect params and bypass', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'distortion', x: 240, y: 180, id: 'fx-dist' })
    state = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-dist' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-dist', toNodeId: 'output' })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-dist', key: 'drive', value: 100 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-dist', key: 'warmth', value: 50 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-dist', key: 'aura', value: 75 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-dist', key: 'output', value: 80 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-dist', key: 'mix', value: 50 })
    state = graphReducer(state, { type: 'toggleNodeBypass', nodeId: 'fx-dist' })

    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(state))
    expect(runtime.hasOutputPath).toBe(true)
    expect(runtime.nodes).toHaveLength(3)
    const distortionNode = runtime.nodes.find((node) => node.effectType === 4)
    expect(distortionNode).toEqual({
      effectType: 4,
      bypass: true,
      p1: 1,
      p2: 0.5,
      p3: 0.75,
      p4: 0.8,
      p5: 0.5,
    })
    expect(runtime.edges).toHaveLength(2)
  })

  test('maps chorus rate in Hz to normalized engine parameter', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'chorus', x: 240, y: 180, id: 'fx-chorus' })
    state = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-chorus' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-chorus', toNodeId: 'output' })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-chorus', key: 'rate', value: 3.5 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-chorus', key: 'depth', value: 65 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-chorus', key: 'mix', value: 42 })

    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(state))
    const chorusNode = runtime.nodes.find((node) => node.effectType === 1)
    expect(chorusNode).toBeDefined()
    expect(chorusNode?.p1).toBeCloseTo(0.65, 5)
    expect(chorusNode?.p2).toBeGreaterThan(0)
    expect(chorusNode?.p2).toBeLessThanOrEqual(1)
    expect(chorusNode?.p3).toBeCloseTo(0.42, 5)
  })

  test('keeps runtime graph shape when no input-output path exists', () => {
    const state = createDefaultGraphState()
    const disconnected = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(disconnected))

    expect(runtime.hasOutputPath).toBe(false)
    expect(runtime.nodes).toHaveLength(2)
    expect(runtime.edges).toHaveLength(0)
  })
})
