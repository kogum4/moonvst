import { describe, expect, test } from 'vitest'
import { createDefaultGraphState, graphReducer } from './graphReducer'

describe('showcase graph reducer', () => {
  test('creates default graph with fixed input/output nodes and initial passthrough edge', () => {
    const state = createDefaultGraphState()

    expect(state.nodeLimit).toBe(8)
    expect(state.selectedNodeId).toBeNull()
    expect(state.lastError).toBeNull()
    expect(state.nodes.map((node) => node.kind)).toEqual(['input', 'output'])
    expect(state.nodes.map((node) => node.id)).toEqual(['input', 'output'])
    expect(state.nodes.find((node) => node.id === 'input')).toMatchObject({ x: 80, y: 120 })
    expect(state.nodes.find((node) => node.id === 'output')).toMatchObject({ x: 460, y: 120 })
    expect(state.edges).toEqual([
      {
        id: 'edge-input-output',
        fromNodeId: 'input',
        toNodeId: 'output',
      },
    ])
  })

  test('supports configurable node limit and enforces default/additional limits', () => {
    const configurable = createDefaultGraphState({ nodeLimit: 16 })
    expect(configurable.nodeLimit).toBe(16)

    let atLimit = createDefaultGraphState()
    for (const kind of ['reverb', 'delay', 'gain', 'compressor', 'eq', 'filter'] as const) {
      atLimit = graphReducer(atLimit, {
        type: 'addNode',
        kind,
        x: 100,
        y: 80,
      })
    }
    expect(atLimit.nodes).toHaveLength(8)

    const overLimit = graphReducer(atLimit, {
      type: 'addNode',
      kind: 'distortion',
      x: 200,
      y: 120,
    })
    expect(overLimit.nodes).toHaveLength(8)
    expect(overLimit.lastError).toBe('ERR_NODE_LIMIT_REACHED')
  })

  test('connects and disconnects edges and rejects connections that create cycles', () => {
    const initial = createDefaultGraphState()
    const withFx = graphReducer(initial, {
      type: 'addNode',
      kind: 'reverb',
      id: 'fx-1',
      x: 120,
      y: 80,
    })

    const connected1 = graphReducer(withFx, {
      type: 'connect',
      fromNodeId: 'input',
      toNodeId: 'fx-1',
    })
    const connected2 = graphReducer(connected1, {
      type: 'connect',
      fromNodeId: 'fx-1',
      toNodeId: 'output',
    })

    expect(connected2.edges).toEqual([
      { id: 'edge-input-output', fromNodeId: 'input', toNodeId: 'output' },
      { id: 'edge-input-fx-1', fromNodeId: 'input', toNodeId: 'fx-1' },
      { id: 'edge-fx-1-output', fromNodeId: 'fx-1', toNodeId: 'output' },
    ])

    const cycleRejected = graphReducer(connected2, {
      type: 'connect',
      fromNodeId: 'output',
      toNodeId: 'input',
    })
    expect(cycleRejected.lastError).toBe('ERR_CYCLE_DETECTED')
    expect(cycleRejected.edges).toEqual(connected2.edges)

    const disconnected = graphReducer(connected2, {
      type: 'disconnect',
      fromNodeId: 'input',
      toNodeId: 'fx-1',
    })
    expect(disconnected.edges).toEqual([
      { id: 'edge-input-output', fromNodeId: 'input', toNodeId: 'output' },
      { id: 'edge-fx-1-output', fromNodeId: 'fx-1', toNodeId: 'output' },
    ])
  })

  test('guards fixed I/O nodes from deletion, and supports select/update-param/toggle-bypass actions', () => {
    const initial = createDefaultGraphState()
    const withFx = graphReducer(initial, {
      type: 'addNode',
      kind: 'compressor',
      id: 'fx-2',
      x: 180,
      y: 120,
    })

    const cannotDeleteInput = graphReducer(withFx, {
      type: 'removeNode',
      nodeId: 'input',
    })
    expect(cannotDeleteInput.lastError).toBe('ERR_IO_NODE_REQUIRED')
    expect(cannotDeleteInput.nodes.some((node) => node.id === 'input')).toBe(true)

    const selected = graphReducer(withFx, {
      type: 'selectNode',
      nodeId: 'fx-2',
    })
    expect(selected.selectedNodeId).toBe('fx-2')

    const updated = graphReducer(selected, {
      type: 'updateNodeParam',
      nodeId: 'fx-2',
      key: 'mix',
      value: 0.42,
    })
    expect(updated.nodes.find((node) => node.id === 'fx-2')?.params.mix).toBe(0.42)

    const bypassed = graphReducer(updated, {
      type: 'toggleNodeBypass',
      nodeId: 'fx-2',
    })
    expect(bypassed.nodes.find((node) => node.id === 'fx-2')?.bypass).toBe(true)

    const removed = graphReducer(bypassed, {
      type: 'removeNode',
      nodeId: 'fx-2',
    })
    expect(removed.nodes.some((node) => node.id === 'fx-2')).toBe(false)
  })

  test('moves node coordinates', () => {
    const moved = graphReducer(createDefaultGraphState(), {
      type: 'moveNode',
      nodeId: 'input',
      x: 300,
      y: 210,
    })

    expect(moved.nodes.find((node) => node.id === 'input')).toMatchObject({ x: 300, y: 210 })
  })
})
