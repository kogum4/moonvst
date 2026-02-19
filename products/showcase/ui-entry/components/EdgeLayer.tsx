import type { GraphEdge, GraphNode, NodeId } from '../state/graphTypes'
import { getNodeLabel } from './graphUi'
import styles from './NodeEditorShell.module.css'

type EdgeLayerProps = {
  edges: GraphEdge[]
  nodes: GraphNode[]
  onDisconnect: (fromNodeId: NodeId, toNodeId: NodeId) => void
}

const findNode = (nodes: GraphNode[], nodeId: NodeId) => nodes.find((node) => node.id === nodeId)

export function EdgeLayer({ edges, nodes, onDisconnect }: EdgeLayerProps) {
  return (
    <div aria-label="Edge Layer" className={styles.edgeLayer}>
      {edges.map((edge) => {
        const from = findNode(nodes, edge.fromNodeId)
        const to = findNode(nodes, edge.toNodeId)
        if (!from || !to) {
          return null
        }

        const fromLabel = getNodeLabel(from.kind)
        const toLabel = getNodeLabel(to.kind)

        return (
          <button
            aria-label={`Disconnect ${fromLabel} -> ${toLabel}`}
            className={styles.edgePill}
            key={edge.id}
            onClick={() => onDisconnect(edge.fromNodeId, edge.toNodeId)}
            type="button"
          >
            {fromLabel} {'->'} {toLabel}
          </button>
        )
      })}
    </div>
  )
}
