import type { GraphState, NodeKind } from '../state/graphTypes'
import {
  GRAPH_CONTRACT_ERRORS,
  GRAPH_CONTRACT_MAX_EDGES,
  GRAPH_CONTRACT_MAX_NODES,
  GRAPH_CONTRACT_SCHEMA_VERSION,
  type GraphContractErrorCode,
} from './graphContractConstants'

const ALLOWED_NODE_KINDS: ReadonlySet<NodeKind> = new Set([
  'input',
  'output',
  'chorus',
  'compressor',
  'delay',
  'distortion',
  'eq',
  'filter',
  'reverb',
])

export interface GraphPayloadNode {
  id: string
  kind: NodeKind
  x: number
  y: number
  bypass: boolean
  params: Record<string, number>
}

export interface GraphPayloadEdge {
  fromNodeId: string
  toNodeId: string
}

export interface GraphPayloadV1 {
  graphSchemaVersion: typeof GRAPH_CONTRACT_SCHEMA_VERSION
  nodes: GraphPayloadNode[]
  edges: GraphPayloadEdge[]
}

const byString = (a: string, b: string) => a.localeCompare(b)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toSortedParamRecord = (params: Record<string, number>): Record<string, number> => {
  const sortedEntries = Object.entries(params).sort(([a], [b]) => byString(a, b))
  const result: Record<string, number> = {}
  for (const [key, value] of sortedEntries) {
    result[key] = value
  }
  return result
}

function invalidPayload(code: GraphContractErrorCode): never {
  throw new Error(code)
}

export function normalizeGraphPayload(state: GraphState): GraphPayloadV1 {
  const nodes: GraphPayloadNode[] = state.nodes
    .map((node) => ({
      id: node.id,
      kind: node.kind,
      x: node.x,
      y: node.y,
      bypass: node.bypass,
      params: toSortedParamRecord(node.params),
    }))
    .sort((a, b) => byString(a.id, b.id))

  const edges: GraphPayloadEdge[] = state.edges
    .map((edge) => ({
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
    }))
    .sort((a, b) => {
      const byFrom = byString(a.fromNodeId, b.fromNodeId)
      return byFrom !== 0 ? byFrom : byString(a.toNodeId, b.toNodeId)
    })

  const payload: GraphPayloadV1 = {
    graphSchemaVersion: GRAPH_CONTRACT_SCHEMA_VERSION,
    nodes,
    edges,
  }

  validateGraphPayload(payload)
  return payload
}

export function serializeGraphPayload(state: GraphState): string {
  return JSON.stringify(normalizeGraphPayload(state))
}

export function validateGraphPayload(payload: GraphPayloadV1): GraphPayloadV1 {
  if (payload.graphSchemaVersion !== GRAPH_CONTRACT_SCHEMA_VERSION) {
    invalidPayload(GRAPH_CONTRACT_ERRORS.unsupported_schema_version)
  }
  if (payload.nodes.length === 0 || payload.nodes.length > GRAPH_CONTRACT_MAX_NODES) {
    invalidPayload(GRAPH_CONTRACT_ERRORS.node_limit)
  }
  if (payload.edges.length > GRAPH_CONTRACT_MAX_EDGES) {
    invalidPayload(GRAPH_CONTRACT_ERRORS.edge_limit)
  }

  const nodeIds = new Set<string>()
  for (const node of payload.nodes) {
    if (!ALLOWED_NODE_KINDS.has(node.kind)) {
      invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_node_kind)
    }
    nodeIds.add(node.id)
    for (const value of Object.values(node.params)) {
      if (!Number.isFinite(value)) {
        invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_node_param)
      }
    }
  }

  for (const edge of payload.edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      invalidPayload(GRAPH_CONTRACT_ERRORS.edge_node_not_found)
    }
  }

  return payload
}

export function deserializeGraphPayload(serialized: string): GraphPayloadV1 {
  const parsed = JSON.parse(serialized) as unknown
  if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_payload_shape)
  }
  if (parsed.graphSchemaVersion !== GRAPH_CONTRACT_SCHEMA_VERSION) {
    invalidPayload(GRAPH_CONTRACT_ERRORS.unsupported_schema_version)
  }

  const nodes: GraphPayloadNode[] = parsed.nodes.map((node) => {
    if (!isRecord(node) || !isRecord(node.params)) {
      invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_payload_shape)
    }
    const kind = node.kind
    if (typeof kind !== 'string' || !ALLOWED_NODE_KINDS.has(kind as NodeKind)) {
      invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_node_kind)
    }
    const params: Record<string, number> = {}
    for (const [key, value] of Object.entries(node.params)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_node_param)
      }
      params[key] = value
    }
    if (
      typeof node.id !== 'string'
      || typeof node.x !== 'number'
      || typeof node.y !== 'number'
      || typeof node.bypass !== 'boolean'
    ) {
      invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_payload_shape)
    }
    return {
      id: node.id,
      kind: kind as NodeKind,
      x: node.x,
      y: node.y,
      bypass: node.bypass,
      params: toSortedParamRecord(params),
    }
  })

  const edges: GraphPayloadEdge[] = parsed.edges.map((edge) => {
    if (!isRecord(edge) || typeof edge.fromNodeId !== 'string' || typeof edge.toNodeId !== 'string') {
      invalidPayload(GRAPH_CONTRACT_ERRORS.invalid_payload_shape)
    }
    return {
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
    }
  })

  return validateGraphPayload({
    graphSchemaVersion: GRAPH_CONTRACT_SCHEMA_VERSION,
    nodes: nodes.sort((a, b) => byString(a.id, b.id)),
    edges: edges.sort((a, b) => {
      const byFrom = byString(a.fromNodeId, b.fromNodeId)
      return byFrom !== 0 ? byFrom : byString(a.toNodeId, b.toNodeId)
    }),
  })
}

export { GRAPH_CONTRACT_SCHEMA_VERSION }
