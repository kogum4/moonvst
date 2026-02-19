import type { GraphEdge, GraphNode, NodeId } from '../state/graphTypes'
import { getNodeLabel } from './graphUi'
import styles from './NodeEditorShell.module.css'
import type { RefObject } from 'react'

type EdgeLayerProps = {
  canvasRef: RefObject<HTMLElement | null>
  edges: GraphEdge[]
  nodes: GraphNode[]
  onDisconnect: (fromNodeId: NodeId, toNodeId: NodeId) => void
  previewEdge?: {
    fromNodeId: NodeId
    toX: number
    toY: number
  } | null
}

const findNode = (nodes: GraphNode[], nodeId: NodeId) => nodes.find((node) => node.id === nodeId)

const getPortPoint = (canvasRef: RefObject<HTMLElement | null>, node: GraphNode, side: 'in' | 'out') => {
  const canvas = canvasRef.current
  if (canvas) {
    const button = canvas.querySelector<HTMLButtonElement>(
      `button[data-node-id="${node.id}"][data-port-side="${side}"]`,
    )
    if (button) {
      const canvasRect = canvas.getBoundingClientRect()
      const rect = button.getBoundingClientRect()
      return {
        x: rect.left - canvasRect.left + canvas.scrollLeft + rect.width / 2,
        y: rect.top - canvasRect.top + canvas.scrollTop + rect.height / 2,
      }
    }
  }

  const isIO = node.kind === 'input' || node.kind === 'output'
  const width = isIO ? 140 : 180
  return {
    x: side === 'out' ? node.x + width - 12 : node.x + 12,
    y: node.y + (isIO ? 90 : 130),
  }
}

const getWirePath = (fromX: number, fromY: number, toX: number, toY: number) => {
  const bend = Math.max(40, Math.abs(toX - fromX) * 0.5)
  return `M ${fromX} ${fromY} C ${fromX + bend} ${fromY} ${toX - bend} ${toY} ${toX} ${toY}`
}

const getWireMidpoint = (fromX: number, fromY: number, toX: number, toY: number) => ({
  x: (fromX + toX) / 2,
  y: (fromY + toY) / 2,
})

export function EdgeLayer({ canvasRef, edges, nodes, onDisconnect, previewEdge = null }: EdgeLayerProps) {
  const connectedWires = edges.map((edge) => {
    const from = findNode(nodes, edge.fromNodeId)
    const to = findNode(nodes, edge.toNodeId)
    if (!from || !to) {
      return null
    }
    const fromPoint = getPortPoint(canvasRef, from, 'out')
    const toPoint = getPortPoint(canvasRef, to, 'in')
    const path = getWirePath(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y)
    return { edge, from, to, fromPoint, path, toPoint }
  }).filter((wire): wire is NonNullable<typeof wire> => wire !== null)

  const previewWire = (() => {
    if (!previewEdge) {
      return null
    }
    const fromNode = findNode(nodes, previewEdge.fromNodeId)
    if (!fromNode) {
      return null
    }
    const fromPoint = getPortPoint(canvasRef, fromNode, 'out')
    const path = getWirePath(fromPoint.x, fromPoint.y, previewEdge.toX, previewEdge.toY)
    return { path }
  })()

  return (
    <div aria-label="Edge Layer" className={styles.edgeLayer}>
      <svg aria-label="Graph Wires" className={styles.edgeSvg}>
        {connectedWires.map((wire) => (
          <path
            aria-label={`Wire ${getNodeLabel(wire.from.kind)} -> ${getNodeLabel(wire.to.kind)}`}
            className={styles.edgeWire}
            d={wire.path}
            key={wire.edge.id}
          />
        ))}
        {previewWire ? <path aria-label="Wire Preview" className={styles.edgeWirePreview} d={previewWire.path} /> : null}
      </svg>
      {connectedWires.map((wire) => {
        const fromLabel = getNodeLabel(wire.from.kind)
        const toLabel = getNodeLabel(wire.to.kind)
        const mid = getWireMidpoint(wire.fromPoint.x, wire.fromPoint.y, wire.toPoint.x, wire.toPoint.y)
        return (
          <button
            aria-label={`Disconnect ${fromLabel} -> ${toLabel}`}
            className={styles.edgeDisconnect}
            key={`disconnect-${wire.edge.id}`}
            onClick={() => onDisconnect(wire.edge.fromNodeId, wire.edge.toNodeId)}
            style={{ left: `${mid.x - 10}px`, top: `${mid.y - 10}px` }}
            type="button"
          >
            x
          </button>
        )
      })}
    </div>
  )
}
