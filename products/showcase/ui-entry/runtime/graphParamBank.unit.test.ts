import { describe, expect, test } from 'vitest'
import { createDefaultGraphState, graphReducer } from '../state/graphReducer'
import { compileRuntimeGraphPayload, serializeGraphPayload } from './graphContract'
import {
  GRAPH_HEADER_OFFSET,
  GRAPH_NODE_BANK_OFFSET,
  GRAPH_REVISION_PARAM_INDEX,
  SHOWCASE_TOTAL_PARAM_COUNT,
  toParamBankWrites,
} from './graphParamBank'

describe('showcase graph param bank', () => {
  test('maps runtime graph to fixed parameter bank slots', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'chorus', x: 250, y: 200, id: 'fx-chorus' })
    state = graphReducer(state, { type: 'disconnect', fromNodeId: 'input', toNodeId: 'output' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-chorus' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'fx-chorus', toNodeId: 'output' })

    const runtime = compileRuntimeGraphPayload(serializeGraphPayload(state))
    const writes = toParamBankWrites(runtime, 7)

    expect(writes.length).toBe(SHOWCASE_TOTAL_PARAM_COUNT - GRAPH_HEADER_OFFSET)
    const byIndex = new Map(writes.map((entry) => [entry.index, entry.value] as const))

    expect(byIndex.get(GRAPH_HEADER_OFFSET + 0)).toBe(1)
    expect(byIndex.get(GRAPH_HEADER_OFFSET + 1)).toBe(runtime.nodes.length)
    expect(byIndex.get(GRAPH_HEADER_OFFSET + 2)).toBe(runtime.edges.length)
    expect(byIndex.get(GRAPH_REVISION_PARAM_INDEX)).toBe(7)

    // First node slot follows deterministic ID sort ("fx-chorus").
    expect(byIndex.get(GRAPH_NODE_BANK_OFFSET + 0)).toBe(1)
    expect(byIndex.get(GRAPH_NODE_BANK_OFFSET + 1)).toBe(0)
  })
})
