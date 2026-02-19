import { LogIn, LogOut } from '../../../../packages/ui-core/src/vendor/lucide'
import { useEffect, useRef, useState } from 'react'
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react'
import { EdgeLayer } from './EdgeLayer'
import { EffectNode, IONode } from './NodePrimitives'
import type { EffectKind } from './graphUi'
import { getEffectVisual, getNodeLabel } from './graphUi'
import type { GraphState, NodeId } from '../state/graphTypes'
import styles from './NodeEditorShell.module.css'

const DRAG_EFFECT_KIND = 'application/x-moonvst-effect-kind'

type DragNodeState = {
  nodeId: NodeId
  originX: number
  originY: number
  startClientX: number
  startClientY: number
}

type DragConnectionState = {
  fromNodeId: NodeId
  pointerX: number
  pointerY: number
}

type GraphCanvasProps = {
  onAddNodeAt: (kind: EffectKind, x: number, y: number) => void
  onCompleteConnection: (toNodeId: NodeId) => void
  onDisconnect: (fromNodeId: NodeId, toNodeId: NodeId) => void
  onMoveNode: (nodeId: NodeId, x: number, y: number) => void
  onSelectNode: (nodeId: NodeId) => void
  onStartConnection: (fromNodeId: NodeId) => void
  pendingFromNodeId: NodeId | null
  state: GraphState
}

export function GraphCanvas({
  onAddNodeAt,
  onCompleteConnection,
  onDisconnect,
  onMoveNode,
  onSelectNode,
  onStartConnection,
  pendingFromNodeId,
  state,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLElement | null>(null)
  const [dragNode, setDragNode] = useState<DragNodeState | null>(null)
  const [dragConnection, setDragConnection] = useState<DragConnectionState | null>(null)

  useEffect(() => {
    if (!dragNode && !dragConnection) {
      return
    }

    const originalUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const handlePointerMove = (event: PointerEvent) => {
      if (dragNode) {
        const nextX = Math.max(0, Math.round(dragNode.originX + event.clientX - dragNode.startClientX))
        const nextY = Math.max(0, Math.round(dragNode.originY + event.clientY - dragNode.startClientY))
        onMoveNode(dragNode.nodeId, nextX, nextY)
      }
      if (dragConnection) {
        const canvas = canvasRef.current
        const nextPointer = canvas
          ? {
              x: event.clientX - canvas.getBoundingClientRect().left + canvas.scrollLeft,
              y: event.clientY - canvas.getBoundingClientRect().top + canvas.scrollTop,
            }
          : { x: event.clientX, y: event.clientY }
        setDragConnection((current) => current
          ? {
              ...current,
              pointerX: nextPointer.x,
              pointerY: nextPointer.y,
            }
          : null)
      }
    }

    const handlePointerUp = () => {
      setDragNode(null)
      setDragConnection(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.body.style.userSelect = originalUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragConnection, dragNode, onMoveNode])

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLDivElement>, nodeId: NodeId, originX: number, originY: number) => {
    const target = event.target as HTMLElement
    if (target.closest('button')) {
      return
    }
    onSelectNode(nodeId)
    setDragNode({
      nodeId,
      originX,
      originY,
      startClientX: event.clientX,
      startClientY: event.clientY,
    })
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()

    const effectKind = event.dataTransfer.getData(DRAG_EFFECT_KIND) as EffectKind
    if (!effectKind) {
      return
    }
    onAddNodeAt(effectKind, Math.max(0, Math.round(event.clientX - rect.left - 90)), Math.max(0, Math.round(event.clientY - rect.top - 40)))
  }

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
  }

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return { x: clientX, y: clientY }
    }
    const rect = canvas.getBoundingClientRect()
    return {
      x: clientX - rect.left + canvas.scrollLeft,
      y: clientY - rect.top + canvas.scrollTop,
    }
  }

  const handleOutPortPointerDown = (fromNodeId: NodeId, event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointer = toCanvasPoint(event.clientX, event.clientY)
    onStartConnection(fromNodeId)
    setDragConnection({
      fromNodeId,
      pointerX: pointer.x,
      pointerY: pointer.y,
    })
  }

  const handleInPortPointerUp = (toNodeId: NodeId) => {
    if (!pendingFromNodeId) {
      return
    }
    onCompleteConnection(toNodeId)
    setDragConnection(null)
  }

  const previewEdge = dragConnection
    ? {
        fromNodeId: dragConnection.fromNodeId,
        toX: dragConnection.pointerX,
        toY: dragConnection.pointerY,
      }
    : null

  return (
    <main aria-label="Graph Canvas" className={styles.canvas} data-region-id="jJBPL" onDragOver={handleDragOver} onDrop={handleDrop} ref={canvasRef}>
      <div className={styles.canvasLabel}>
        DAG | Stereo | {state.nodes.length}/{state.nodeLimit} nodes
      </div>
      <EdgeLayer canvasRef={canvasRef} edges={state.edges} nodes={state.nodes} onDisconnect={onDisconnect} previewEdge={previewEdge} />
      {state.nodes.map((node) => {
        const isSelected = state.selectedNodeId === node.id
        const nodeLabel = getNodeLabel(node.kind)
        const style = { left: `${node.x}px`, top: `${node.y}px` }

        if (node.kind === 'input') {
          return (
            <div
              className={styles.canvasNode}
              data-testid={`canvas-node-${node.id}`}
              key={node.id}
              onPointerDown={(event) => handleNodePointerDown(event, node.id, node.x, node.y)}
              style={style}
            >
              <IONode
                icon={<LogIn size={12} />}
                nodeId={node.id}
                onClick={() => onSelectNode(node.id)}
                onOutPortClick={() => onStartConnection(node.id)}
                onOutPortPointerDown={(event) => handleOutPortPointerDown(node.id, event)}
                outPortAriaLabel="Input OUT port"
                selected={isSelected}
                variant="input"
              />
            </div>
          )
        }

        if (node.kind === 'output') {
          return (
            <div
              className={styles.canvasNode}
              data-testid={`canvas-node-${node.id}`}
              key={node.id}
              onPointerDown={(event) => handleNodePointerDown(event, node.id, node.x, node.y)}
              style={style}
            >
              <IONode
                icon={<LogOut size={12} />}
                inPortAriaLabel="Output IN port"
                nodeId={node.id}
                onClick={() => onSelectNode(node.id)}
                onInPortClick={() => onCompleteConnection(node.id)}
                onInPortPointerUp={() => handleInPortPointerUp(node.id)}
                selected={isSelected}
                variant="output"
              />
            </div>
          )
        }

        const visual = getEffectVisual(node.kind)
        const Icon = visual.icon
        return (
          <div
            className={styles.canvasNode}
            data-testid={`canvas-node-${node.id}`}
            key={node.id}
            onPointerDown={(event) => handleNodePointerDown(event, node.id, node.x, node.y)}
            style={style}
          >
            <EffectNode
              color={visual.color}
              icon={<Icon size={12} />}
              inPortAriaLabel={`${nodeLabel} IN port`}
              label={visual.label}
              nodeId={node.id}
              onClick={() => onSelectNode(node.id)}
              onInPortClick={() => onCompleteConnection(node.id)}
              onInPortPointerUp={() => handleInPortPointerUp(node.id)}
              onOutPortClick={() => onStartConnection(node.id)}
              onOutPortPointerDown={(event) => handleOutPortPointerDown(node.id, event)}
              outPortAriaLabel={`${nodeLabel} OUT port`}
              rows={visual.rows}
              selected={isSelected}
            />
          </div>
        )
      })}
      <div className={styles.connectionHint}>
        {pendingFromNodeId ? `Connecting from ${pendingFromNodeId}...` : 'Select OUT then IN to connect'}
      </div>
      {state.lastError ? <div className={styles.canvasError}>{state.lastError}</div> : null}
    </main>
  )
}
