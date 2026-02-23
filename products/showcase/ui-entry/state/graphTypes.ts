export type NodeKind =
  | 'input'
  | 'output'
  | 'gain'
  | 'chorus'
  | 'compressor'
  | 'delay'
  | 'distortion'
  | 'eq'
  | 'filter'
  | 'reverb'

export type NodeId = string
export type EdgeId = string

export interface GraphNode {
  id: NodeId
  kind: NodeKind
  x: number
  y: number
  bypass: boolean
  params: Record<string, number>
}

export interface GraphEdge {
  id: EdgeId
  fromNodeId: NodeId
  toNodeId: NodeId
}

export type GraphErrorCode =
  | 'ERR_NODE_LIMIT_REACHED'
  | 'ERR_DUPLICATE_NODE_ID'
  | 'ERR_NODE_NOT_FOUND'
  | 'ERR_IO_NODE_REQUIRED'
  | 'ERR_EDGE_NOT_FOUND'
  | 'ERR_EDGE_ALREADY_EXISTS'
  | 'ERR_SELF_EDGE_FORBIDDEN'
  | 'ERR_CYCLE_DETECTED'

export interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: NodeId | null
  nodeLimit: number
  nextNodeSerial: number
  lastError: GraphErrorCode | null
}

export interface CreateDefaultGraphOptions {
  nodeLimit?: number
}

export type GraphAction =
  | { type: 'addNode'; kind: Exclude<NodeKind, 'input' | 'output'>; x: number; y: number; id?: NodeId }
  | { type: 'moveNode'; nodeId: NodeId; x: number; y: number }
  | { type: 'removeNode'; nodeId: NodeId }
  | { type: 'connect'; fromNodeId: NodeId; toNodeId: NodeId }
  | { type: 'disconnect'; fromNodeId: NodeId; toNodeId: NodeId }
  | { type: 'selectNode'; nodeId: NodeId | null }
  | { type: 'updateNodeParam'; nodeId: NodeId; key: string; value: number }
  | { type: 'toggleNodeBypass'; nodeId: NodeId }
