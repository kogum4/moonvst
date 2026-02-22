import type { RuntimeGraphPayload } from './graphContract'
import {
  GRAPH_CONTRACT_MAX_EDGES,
  GRAPH_CONTRACT_MAX_NODES,
  GRAPH_CONTRACT_SCHEMA_VERSION,
} from './graphContractConstants'

export interface ParamWrite {
  index: number
  value: number
}

export const SHOWCASE_BASE_PARAM_COUNT = 6
export const GRAPH_HEADER_OFFSET = SHOWCASE_BASE_PARAM_COUNT
export const GRAPH_NODE_STRIDE = 11
export const GRAPH_EDGE_STRIDE = 2
export const GRAPH_HEADER_SIZE = 4
export const GRAPH_NODE_BANK_OFFSET = GRAPH_HEADER_OFFSET + GRAPH_HEADER_SIZE
export const GRAPH_EDGE_BANK_OFFSET = GRAPH_NODE_BANK_OFFSET + (GRAPH_CONTRACT_MAX_NODES * GRAPH_NODE_STRIDE)
export const GRAPH_REVISION_PARAM_INDEX = GRAPH_EDGE_BANK_OFFSET + (GRAPH_CONTRACT_MAX_EDGES * GRAPH_EDGE_STRIDE)
export const SHOWCASE_TOTAL_PARAM_COUNT = GRAPH_REVISION_PARAM_INDEX + 1

export function toParamBankWrites(runtime: RuntimeGraphPayload, revision: number): ParamWrite[] {
  const writes: ParamWrite[] = []

  writes.push({ index: GRAPH_HEADER_OFFSET + 0, value: runtime.schemaVersion })
  writes.push({ index: GRAPH_HEADER_OFFSET + 1, value: runtime.nodes.length })
  writes.push({ index: GRAPH_HEADER_OFFSET + 2, value: runtime.edges.length })
  writes.push({ index: GRAPH_HEADER_OFFSET + 3, value: runtime.hasOutputPath ? 1 : 0 })

  for (let i = 0; i < GRAPH_CONTRACT_MAX_NODES; i += 1) {
    const node = runtime.nodes[i]
    const base = GRAPH_NODE_BANK_OFFSET + (i * GRAPH_NODE_STRIDE)
    if (!node) {
      writes.push({ index: base + 0, value: 0 })
      writes.push({ index: base + 1, value: 1 })
      writes.push({ index: base + 2, value: 1 })
      writes.push({ index: base + 3, value: 0 })
      writes.push({ index: base + 4, value: 0 })
      writes.push({ index: base + 5, value: 0 })
      writes.push({ index: base + 6, value: 0 })
      writes.push({ index: base + 7, value: 0 })
      writes.push({ index: base + 8, value: 0 })
      writes.push({ index: base + 9, value: 0 })
      writes.push({ index: base + 10, value: 0 })
      continue
    }
    writes.push({ index: base + 0, value: node.effectType })
    writes.push({ index: base + 1, value: node.bypass ? 1 : 0 })
    writes.push({ index: base + 2, value: node.p1 })
    writes.push({ index: base + 3, value: node.p2 })
    writes.push({ index: base + 4, value: node.p3 })
    writes.push({ index: base + 5, value: node.p4 })
    writes.push({ index: base + 6, value: node.p5 })
    writes.push({ index: base + 7, value: node.p6 })
    writes.push({ index: base + 8, value: node.p7 })
    writes.push({ index: base + 9, value: node.p8 })
    writes.push({ index: base + 10, value: node.p9 })
  }

  for (let i = 0; i < GRAPH_CONTRACT_MAX_EDGES; i += 1) {
    const edge = runtime.edges[i]
    const base = GRAPH_EDGE_BANK_OFFSET + (i * GRAPH_EDGE_STRIDE)
    writes.push({ index: base + 0, value: edge ? edge.fromIndex : -1 })
    writes.push({ index: base + 1, value: edge ? edge.toIndex : -1 })
  }

  writes.push({ index: GRAPH_REVISION_PARAM_INDEX, value: revision })
  return writes
}

export function validateRuntimeGraphSchema(schemaVersion: number): void {
  if (schemaVersion !== GRAPH_CONTRACT_SCHEMA_VERSION) {
    throw new Error('ERR_UNSUPPORTED_SCHEMA_VERSION')
  }
}
