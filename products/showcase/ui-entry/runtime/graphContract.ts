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

export interface RuntimeGraphNode {
  effectType: number
  bypass: boolean
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
}

export interface RuntimeGraphEdge {
  fromIndex: number
  toIndex: number
}

export interface RuntimeGraphPayload {
  schemaVersion: number
  hasOutputPath: boolean
  nodes: RuntimeGraphNode[]
  edges: RuntimeGraphEdge[]
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

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const toUnit = (value: number, min: number, max: number): number => {
  if (max <= min) {
    return 0
  }
  return clamp((value - min) / (max - min), 0, 1)
}

const dbToLinear = (db: number): number => {
  const linear = 10 ** (db / 20)
  return clamp(linear, 0, 1)
}

const CHORUS_SAMPLE_RATE = 48_000
const CHORUS_MAX_RATE_HZ = (0.001 * CHORUS_SAMPLE_RATE) / (2 * Math.PI)

const chorusRateHzToParam = (rateHz: number): number => {
  const normalizedHz = clamp(rateHz / CHORUS_MAX_RATE_HZ, 0, 1)
  return Math.pow(normalizedHz, 0.25)
}

const effectTypeByKind: Partial<Record<NodeKind, number>> = {
  chorus: 1,
  compressor: 2,
  delay: 3,
  distortion: 4,
  eq: 5,
  filter: 6,
  reverb: 7,
}

const normalizeNodeParams = (node: GraphPayloadNode): RuntimeGraphNode => {
  switch (node.kind) {
    case 'chorus':
      return {
        effectType: effectTypeByKind.chorus!,
        bypass: node.bypass,
        p1: toUnit(node.params.depth ?? 55, 0, 100),
        p2: chorusRateHzToParam(node.params.rate ?? 1.2),
        p3: toUnit(node.params.mix ?? 35, 0, 100),
        p4: 0,
        p5: 0,
      }
    case 'compressor':
      return {
        effectType: effectTypeByKind.compressor!,
        bypass: node.bypass,
        p1: dbToLinear(node.params.threshold ?? -18),
        p2: clamp(node.params.ratio ?? 4, 1, 20),
        p3: 0,
        p4: 0,
        p5: 0,
      }
    case 'delay':
      return {
        effectType: effectTypeByKind.delay!,
        bypass: node.bypass,
        p1: toUnit(node.params.feedback ?? 35, 0, 100),
        p2: toUnit(node.params.mix ?? 25, 0, 100),
        p3: 0,
        p4: 0,
        p5: 0,
      }
    case 'distortion':
      {
        const driveParam = node.params.drive ?? 60
        const warmthParam = node.params.warmth ?? 50
        const auraParam = node.params.aura ?? 50
        const outputParam = node.params.output ?? 100
        const mixParam = node.params.mix ?? 100
        return {
          effectType: effectTypeByKind.distortion!,
          bypass: node.bypass,
          p1: toUnit(driveParam, 0, 100),
          p2: toUnit(warmthParam, 0, 100),
          p3: toUnit(auraParam, 0, 100),
          p4: toUnit(outputParam, 0, 100),
          p5: toUnit(mixParam, 0, 100),
        }
      }
    case 'eq':
      return {
        effectType: effectTypeByKind.eq!,
        bypass: node.bypass,
        p1: clamp(((node.params.high ?? 2.1) - (node.params.low ?? 1.8)) / 24, -1, 1),
        p2: clamp(1 + (node.params.mid ?? -0.6) / 12, 0, 2),
        p3: 0,
        p4: 0,
        p5: 0,
      }
    case 'filter':
      {
        const q = clamp(node.params.q ?? node.params.resonance ?? 0.707, 0.2, 20.0)
        const k = clamp(1 / q, 0, 2)
        const resonance = clamp(k * 0.5, 0, 1)
        return {
          effectType: effectTypeByKind.filter!,
          bypass: node.bypass,
          p1: clamp(0.01 + toUnit(node.params.cutoff ?? 2500, 40, 20000) * 0.99, 0.01, 1),
          p2: resonance,
          p3: toUnit(node.params.mode ?? 0, 0, 5),
          p4: toUnit(node.params.mix ?? 100, 0, 100),
          p5: 0,
        }
      }
    case 'reverb':
      return {
        effectType: effectTypeByKind.reverb!,
        bypass: node.bypass,
        p1: toUnit(node.params.mix ?? 30, 0, 100),
        p2: 0,
        p3: 0,
        p4: 0,
        p5: 0,
      }
    case 'input':
    case 'output':
    default:
      return {
        effectType: 0,
        bypass: true,
        p1: 1,
        p2: 0,
        p3: 0,
        p4: 0,
        p5: 0,
      }
  }
}

const collectReachableIds = (
  startId: string,
  adjacency: Map<string, string[]>,
): Set<string> => {
  const visited = new Set<string>()
  const queue = [startId]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) {
      continue
    }
    visited.add(current)
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        queue.push(next)
      }
    }
  }
  return visited
}

export function compileRuntimeGraphPayload(serialized: string): RuntimeGraphPayload {
  const payload = deserializeGraphPayload(serialized)
  const adjacency = new Map<string, string[]>()

  for (const edge of payload.edges) {
    const forward = adjacency.get(edge.fromNodeId) ?? []
    forward.push(edge.toNodeId)
    adjacency.set(edge.fromNodeId, forward)
  }

  const reachableFromInput = collectReachableIds('input', adjacency)
  const hasOutputPath = reachableFromInput.has('output')

  const nodeIndexById = new Map(payload.nodes.map((node, index) => [node.id, index] as const))
  const mappedEdges = payload.edges
    .map((edge) => ({
      fromIndex: nodeIndexById.get(edge.fromNodeId) ?? -1,
      toIndex: nodeIndexById.get(edge.toNodeId) ?? -1,
    }))
    .filter((edge) => edge.fromIndex >= 0 && edge.toIndex >= 0)

  return {
    schemaVersion: payload.graphSchemaVersion,
    hasOutputPath,
    nodes: payload.nodes.map(normalizeNodeParams),
    edges: mappedEdges,
  }
}

export { GRAPH_CONTRACT_SCHEMA_VERSION }
