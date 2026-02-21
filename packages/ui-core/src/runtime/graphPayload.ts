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

type NodeKind =
  | 'input'
  | 'output'
  | 'chorus'
  | 'compressor'
  | 'delay'
  | 'distortion'
  | 'eq'
  | 'filter'
  | 'reverb'

interface GraphPayloadNode {
  id: string
  kind: NodeKind
  bypass: boolean
  params: Record<string, number>
}

interface GraphPayloadEdge {
  fromNodeId: string
  toNodeId: string
}

interface GraphPayloadV1 {
  graphSchemaVersion: 1
  nodes: GraphPayloadNode[]
  edges: GraphPayloadEdge[]
}

const GRAPH_SCHEMA_VERSION = 1 as const

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

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

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

function parseGraphPayload(serialized: string): GraphPayloadV1 {
  const parsed = JSON.parse(serialized) as unknown
  if (!isRecord(parsed) || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('ERR_INVALID_PAYLOAD_SHAPE')
  }
  if (parsed.graphSchemaVersion !== GRAPH_SCHEMA_VERSION) {
    throw new Error('ERR_UNSUPPORTED_SCHEMA_VERSION')
  }

  const nodes: GraphPayloadNode[] = parsed.nodes.map((rawNode) => {
    if (!isRecord(rawNode) || !isRecord(rawNode.params)) {
      throw new Error('ERR_INVALID_PAYLOAD_SHAPE')
    }

    const kind = rawNode.kind
    if (typeof kind !== 'string' || !ALLOWED_NODE_KINDS.has(kind as NodeKind)) {
      throw new Error('ERR_INVALID_NODE_KIND')
    }
    if (typeof rawNode.id !== 'string' || typeof rawNode.bypass !== 'boolean') {
      throw new Error('ERR_INVALID_PAYLOAD_SHAPE')
    }

    const params: Record<string, number> = {}
    for (const [key, value] of Object.entries(rawNode.params)) {
      const parsedNumber = asFiniteNumber(value)
      if (parsedNumber === null) {
        throw new Error('ERR_INVALID_NODE_PARAM')
      }
      params[key] = parsedNumber
    }

    return {
      id: rawNode.id,
      kind: kind as NodeKind,
      bypass: rawNode.bypass,
      params,
    }
  })

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: GraphPayloadEdge[] = parsed.edges.map((rawEdge) => {
    if (
      !isRecord(rawEdge)
      || typeof rawEdge.fromNodeId !== 'string'
      || typeof rawEdge.toNodeId !== 'string'
    ) {
      throw new Error('ERR_INVALID_PAYLOAD_SHAPE')
    }
    if (!nodeIds.has(rawEdge.fromNodeId) || !nodeIds.has(rawEdge.toNodeId)) {
      throw new Error('ERR_EDGE_NODE_NOT_FOUND')
    }
    return { fromNodeId: rawEdge.fromNodeId, toNodeId: rawEdge.toNodeId }
  })

  return {
    graphSchemaVersion: GRAPH_SCHEMA_VERSION,
    nodes,
    edges,
  }
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
      return {
        effectType: effectTypeByKind.filter!,
        bypass: node.bypass,
        p1: clamp(0.01 + toUnit(node.params.cutoff ?? 2500, 40, 12000) * 0.99, 0.01, 1),
        p2: clamp(toUnit(node.params.resonance ?? 0.7, 0.1, 2) * 0.95, 0, 0.95),
        p3: 0,
        p4: 0,
        p5: 0,
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
  const payload = parseGraphPayload(serialized)
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
