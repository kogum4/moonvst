import type {
  CreateDefaultGraphOptions,
  GraphAction,
  GraphEdge,
  GraphErrorCode,
  GraphNode,
  GraphState,
  NodeId,
} from './graphTypes'

const INPUT_NODE_ID = 'input'
const OUTPUT_NODE_ID = 'output'
const DEFAULT_NODE_LIMIT = 8
const MAX_NODE_LIMIT = 16

const FIXED_NODE_IDS = new Set([INPUT_NODE_ID, OUTPUT_NODE_ID])

const createEdgeId = (fromNodeId: NodeId, toNodeId: NodeId) => `edge-${fromNodeId}-${toNodeId}`

const clearError = (state: GraphState): GraphState => ({ ...state, lastError: null })

const withError = (state: GraphState, code: GraphErrorCode): GraphState => ({ ...state, lastError: code })

const nodeExists = (state: GraphState, nodeId: NodeId) => state.nodes.some((node) => node.id === nodeId)

const hasEdge = (state: GraphState, fromNodeId: NodeId, toNodeId: NodeId) =>
  state.edges.some((edge) => edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId)

const wouldCreateCycle = (nodes: GraphNode[], edges: GraphEdge[]) => {
  const adjacency = new Map<NodeId, NodeId[]>()
  const inDegree = new Map<NodeId, number>()

  for (const node of nodes) {
    adjacency.set(node.id, [])
    inDegree.set(node.id, 0)
  }

  for (const edge of edges) {
    if (!adjacency.has(edge.fromNodeId) || !adjacency.has(edge.toNodeId)) {
      continue
    }
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId)
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1)
  }

  const queue: NodeId[] = []
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId)
    }
  }

  let visited = 0
  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId) {
      break
    }
    visited += 1
    const neighbors = adjacency.get(nodeId) ?? []
    for (const neighbor of neighbors) {
      const nextDegree = (inDegree.get(neighbor) ?? 0) - 1
      inDegree.set(neighbor, nextDegree)
      if (nextDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  return visited !== nodes.length
}

const clampNodeLimit = (value?: number) => {
  if (value === undefined) {
    return DEFAULT_NODE_LIMIT
  }
  return Math.max(DEFAULT_NODE_LIMIT, Math.min(MAX_NODE_LIMIT, value))
}

export function createDefaultGraphState(options?: CreateDefaultGraphOptions): GraphState {
  return {
    nodes: [
      {
        id: INPUT_NODE_ID,
        kind: 'input',
        x: 80,
        y: 120,
        bypass: false,
        params: {},
      },
      {
        id: OUTPUT_NODE_ID,
        kind: 'output',
        x: 460,
        y: 120,
        bypass: false,
        params: {},
      },
    ],
    edges: [
      {
        id: createEdgeId(INPUT_NODE_ID, OUTPUT_NODE_ID),
        fromNodeId: INPUT_NODE_ID,
        toNodeId: OUTPUT_NODE_ID,
      },
    ],
    selectedNodeId: null,
    nodeLimit: clampNodeLimit(options?.nodeLimit),
    nextNodeSerial: 1,
    lastError: null,
  }
}

export function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'addNode': {
      if (state.nodes.length >= state.nodeLimit) {
        return withError(state, 'ERR_NODE_LIMIT_REACHED')
      }

      const nextId = action.id ?? `fx-${state.nextNodeSerial}`
      if (nodeExists(state, nextId)) {
        return withError(state, 'ERR_DUPLICATE_NODE_ID')
      }

      const nextNode: GraphNode = {
        id: nextId,
        kind: action.kind,
        x: action.x,
        y: action.y,
        bypass: false,
        params: {},
      }

      return {
        ...clearError(state),
        nodes: [...state.nodes, nextNode],
        nextNodeSerial: state.nextNodeSerial + (action.id ? 0 : 1),
      }
    }

    case 'removeNode': {
      if (FIXED_NODE_IDS.has(action.nodeId)) {
        return withError(state, 'ERR_IO_NODE_REQUIRED')
      }
      if (!nodeExists(state, action.nodeId)) {
        return withError(state, 'ERR_NODE_NOT_FOUND')
      }

      return {
        ...clearError(state),
        nodes: state.nodes.filter((node) => node.id !== action.nodeId),
        edges: state.edges.filter(
          (edge) => edge.fromNodeId !== action.nodeId && edge.toNodeId !== action.nodeId,
        ),
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
      }
    }

    case 'moveNode': {
      if (!nodeExists(state, action.nodeId)) {
        return withError(state, 'ERR_NODE_NOT_FOUND')
      }
      return {
        ...clearError(state),
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId
            ? {
                ...node,
                x: action.x,
                y: action.y,
              }
            : node,
        ),
      }
    }

    case 'connect': {
      if (action.fromNodeId === action.toNodeId) {
        return withError(state, 'ERR_SELF_EDGE_FORBIDDEN')
      }
      if (!nodeExists(state, action.fromNodeId) || !nodeExists(state, action.toNodeId)) {
        return withError(state, 'ERR_NODE_NOT_FOUND')
      }
      if (hasEdge(state, action.fromNodeId, action.toNodeId)) {
        return withError(state, 'ERR_EDGE_ALREADY_EXISTS')
      }

      const nextEdge: GraphEdge = {
        id: createEdgeId(action.fromNodeId, action.toNodeId),
        fromNodeId: action.fromNodeId,
        toNodeId: action.toNodeId,
      }
      const nextEdges = [...state.edges, nextEdge]
      if (wouldCreateCycle(state.nodes, nextEdges)) {
        return withError(state, 'ERR_CYCLE_DETECTED')
      }

      return {
        ...clearError(state),
        edges: nextEdges,
      }
    }

    case 'disconnect': {
      if (!hasEdge(state, action.fromNodeId, action.toNodeId)) {
        return withError(state, 'ERR_EDGE_NOT_FOUND')
      }
      return {
        ...clearError(state),
        edges: state.edges.filter(
          (edge) => !(edge.fromNodeId === action.fromNodeId && edge.toNodeId === action.toNodeId),
        ),
      }
    }

    case 'selectNode': {
      if (action.nodeId !== null && !nodeExists(state, action.nodeId)) {
        return withError(state, 'ERR_NODE_NOT_FOUND')
      }
      return {
        ...clearError(state),
        selectedNodeId: action.nodeId,
      }
    }

    case 'updateNodeParam': {
      if (!nodeExists(state, action.nodeId)) {
        return withError(state, 'ERR_NODE_NOT_FOUND')
      }
      return {
        ...clearError(state),
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId
            ? {
                ...node,
                params: {
                  ...node.params,
                  [action.key]: action.value,
                },
              }
            : node,
        ),
      }
    }

    case 'toggleNodeBypass': {
      if (!nodeExists(state, action.nodeId)) {
        return withError(state, 'ERR_NODE_NOT_FOUND')
      }
      return {
        ...clearError(state),
        nodes: state.nodes.map((node) =>
          node.id === action.nodeId
            ? {
                ...node,
                bypass: !node.bypass,
              }
            : node,
        ),
      }
    }
  }
}
