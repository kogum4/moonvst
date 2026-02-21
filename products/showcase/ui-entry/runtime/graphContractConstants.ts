export const GRAPH_CONTRACT_SCHEMA_VERSION = 1 as const
export const GRAPH_CONTRACT_MAX_NODES = 16
export const GRAPH_CONTRACT_MAX_EDGES = 64
export const GRAPH_CONTRACT_EVENT_ID = 'moonvst:showcase:graph-payload'

export const GRAPH_CONTRACT_ERRORS = {
  invalid_payload_shape: 'ERR_INVALID_PAYLOAD_SHAPE',
  unsupported_schema_version: 'ERR_UNSUPPORTED_SCHEMA_VERSION',
  node_limit: 'ERR_NODE_LIMIT_REACHED',
  edge_limit: 'ERR_EDGE_LIMIT_REACHED',
  invalid_node_kind: 'ERR_INVALID_NODE_KIND',
  edge_node_not_found: 'ERR_EDGE_NODE_NOT_FOUND',
  invalid_node_param: 'ERR_INVALID_NODE_PARAM',
} as const

export type GraphContractErrorCode =
  (typeof GRAPH_CONTRACT_ERRORS)[keyof typeof GRAPH_CONTRACT_ERRORS]
