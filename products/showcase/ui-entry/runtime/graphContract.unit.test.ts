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
      p6: 0,
      p7: 0,
      p8: 0,
      p9: 0,
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

  test('maps delay tape params to runtime p1..p6', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'delay', x: 240, y: 180, id: 'fx-delay' })
    state = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-delay' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-delay', toNodeId: 'output' })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-delay', key: 'timeMs', value: 500 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-delay', key: 'feedback', value: 41 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-delay', key: 'filterHz', value: 3200 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-delay', key: 'filterQ', value: 0.49 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-delay', key: 'flutter', value: 18 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-delay', key: 'wetDry', value: 55 })

    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(state))
    const delayNode = runtime.nodes.find((node) => node.effectType === 3)
    expect(delayNode).toBeDefined()
    expect(delayNode?.effectType).toBe(3)
    expect(delayNode?.bypass).toBe(false)
    expect(delayNode?.p1).toBeCloseTo(0.5886, 3)
    expect(delayNode?.p2).toBeCloseTo(0.6403, 3)
    expect(delayNode?.p3).toBeCloseTo(0.5499, 3)
    expect(delayNode?.p4).toBeCloseTo(0.6928, 3)
    expect(delayNode?.p5).toBeCloseTo(0.18, 5)
    expect(delayNode?.p6).toBeCloseTo(0.55, 5)
    expect(delayNode?.p7).toBe(0)
    expect(delayNode?.p8).toBe(0)
    expect(delayNode?.p9).toBe(0)
  })

  test('maps compressor advanced params to runtime p1..p9', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'compressor', x: 240, y: 180, id: 'fx-comp' })
    state = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-comp' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-comp', toNodeId: 'output' })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'pregain', value: 6 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'threshold', value: -30 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'knee', value: 12 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'ratio', value: 6 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'attack', value: 10 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'release', value: 350 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'predelay', value: 5 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'postgain', value: 3 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-comp', key: 'wet', value: 80 })

    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(state))
    const compressorNode = runtime.nodes.find((node) => node.effectType === 2)
    expect(compressorNode).toEqual({
      effectType: 2,
      bypass: false,
      p1: 6,
      p2: -30,
      p3: 12,
      p4: 6,
      p5: 0.01,
      p6: 0.35,
      p7: 0.005,
      p8: 3,
      p9: 0.8,
    })
  })

  test('maps filter mode and mix to runtime p3/p4', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'filter', x: 240, y: 180, id: 'fx-filter' })
    state = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-filter' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-filter', toNodeId: 'output' })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-filter', key: 'cutoff', value: 6400 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-filter', key: 'q', value: 4.0 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-filter', key: 'mode', value: 3 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-filter', key: 'mix', value: 65 })

    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(state))
    const filterNode = runtime.nodes.find((node) => node.effectType === 6)
    expect(filterNode).toBeDefined()
    expect(filterNode?.p1).toBeGreaterThan(0.01)
    expect(filterNode?.p1).toBeLessThanOrEqual(1)
    expect(filterNode?.p2).toBeCloseTo(0.125, 5)
    expect(filterNode?.p3).toBeCloseTo(3 / 5, 5)
    expect(filterNode?.p4).toBeCloseTo(0.65, 5)
    expect(filterNode?.p5).toBe(0)
  })

  test('maps eq 5-band gains directly to runtime p1..p5', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'eq', x: 240, y: 180, id: 'fx-eq' })
    state = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-eq' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-eq', toNodeId: 'output' })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-eq', key: 'low', value: 4.5 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-eq', key: 'lowMid', value: -3.0 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-eq', key: 'mid', value: 2.0 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-eq', key: 'highMid', value: -1.5 })
    state = graphReducer(state, { type: 'updateNodeParam', nodeId: 'fx-eq', key: 'high', value: 6.0 })

    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(state))
    const eqNode = runtime.nodes.find((node) => node.effectType === 5)
    expect(eqNode).toEqual({
      effectType: 5,
      bypass: false,
      p1: 4.5,
      p2: -3.0,
      p3: 2.0,
      p4: -1.5,
      p5: 6.0,
      p6: 0,
      p7: 0,
      p8: 0,
      p9: 0,
    })
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
