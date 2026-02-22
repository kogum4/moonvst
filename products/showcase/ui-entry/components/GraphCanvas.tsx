import { LogIn, LogOut } from '../vendor/lucide'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react'
import { EdgeLayer } from './EdgeLayer'
import { EffectNode, IONode } from './NodePrimitives'
import type { EffectKind } from './graphUi'
import { getEffectVisual, getNodeLabel } from './graphUi'
import type { GraphState, NodeId } from '../state/graphTypes'
import { formatNodeParamValue, getNodeParamSpecs } from '../state/nodeParamSchema'
import styles from './NodeEditorShell.module.css'

const DRAG_EFFECT_KIND = 'application/x-moonvst-effect-kind'
const DRAG_EFFECT_ANCHOR = 'application/x-moonvst-effect-anchor'
const CANVAS_SCROLLBAR_COLOR = 'rgba(56, 189, 248, 0.55) rgba(15, 23, 42, 0.85)'
const HIDDEN_SCROLLBAR_COLOR = 'transparent transparent'
const SCROLL_OVERFLOW_EPSILON_PX = 2
const NODE_BOUNDS_PADDING_PX = 24
const DEFAULT_DROP_OFFSET_X = 90
const DEFAULT_DROP_OFFSET_Y = 16

const getNodeBounds = (kind: string) => {
  if (kind === 'input' || kind === 'output') {
    return { height: 120, width: 140 }
  }
  return { height: 160, width: 180 }
}

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
  onRemoveNode: (nodeId: NodeId) => void
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
  onRemoveNode,
  onSelectNode,
  onStartConnection,
  pendingFromNodeId,
  state,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLElement | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const [dragNode, setDragNode] = useState<DragNodeState | null>(null)
  const [dragConnection, setDragConnection] = useState<DragConnectionState | null>(null)
  const [canvasViewport, setCanvasViewport] = useState({ height: 0, width: 0 })
  const [contextMenu, setContextMenu] = useState<{ nodeId: NodeId; x: number; y: number } | null>(null)

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

  useEffect(() => {
    if (!contextMenu) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return
      }
      setContextMenu(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const updateViewport = () => {
      const rect = canvas.getBoundingClientRect()
      setCanvasViewport({
        height: Math.round(rect.height),
        width: Math.round(rect.width),
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateViewport)
      resizeObserver.observe(canvas)
    }

    return () => {
      window.removeEventListener('resize', updateViewport)
      resizeObserver?.disconnect()
    }
  }, [])

  const { canScrollX, canScrollY } = useMemo(() => {
    if (canvasViewport.width <= 0 || canvasViewport.height <= 0) {
      return { canScrollX: false, canScrollY: false }
    }

    const content = state.nodes.reduce(
      (acc, node) => {
        const bounds = getNodeBounds(node.kind)
        return {
          maxX: Math.max(acc.maxX, node.x + bounds.width),
          maxY: Math.max(acc.maxY, node.y + bounds.height),
        }
      },
      { maxX: 0, maxY: 0 },
    )

    const requiredWidth = content.maxX + NODE_BOUNDS_PADDING_PX
    const requiredHeight = content.maxY + NODE_BOUNDS_PADDING_PX

    return {
      canScrollX: requiredWidth - canvasViewport.width > SCROLL_OVERFLOW_EPSILON_PX,
      canScrollY: requiredHeight - canvasViewport.height > SCROLL_OVERFLOW_EPSILON_PX,
    }
  }, [canvasViewport.height, canvasViewport.width, state.nodes])

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

  const handleNodeContextMenu = (event: ReactPointerEvent<HTMLDivElement>, nodeId: NodeId) => {
    event.preventDefault()
    event.stopPropagation()
    onSelectNode(nodeId)
    setContextMenu({
      nodeId,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const canvasLeft = Number.isFinite(rect.left) ? rect.left : 0
    const canvasTop = Number.isFinite(rect.top) ? rect.top : 0

    const effectKind = event.dataTransfer.getData(DRAG_EFFECT_KIND) as EffectKind
    if (!effectKind) {
      return
    }
    const anchorRaw = event.dataTransfer.getData(DRAG_EFFECT_ANCHOR)
    const [anchorXRaw, anchorYRaw] = anchorRaw.split(',')
    const anchorX = Number(anchorXRaw)
    const anchorY = Number(anchorYRaw)
    const offsetX = Number.isFinite(anchorX) ? anchorX : DEFAULT_DROP_OFFSET_X
    const offsetY = Number.isFinite(anchorY) ? anchorY : DEFAULT_DROP_OFFSET_Y

    onAddNodeAt(
      effectKind,
      Math.max(0, Math.round(event.clientX - canvasLeft - offsetX)),
      Math.max(0, Math.round(event.clientY - canvasTop - offsetY)),
    )
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

  const contextMenuNode = contextMenu
    ? state.nodes.find((node) => node.id === contextMenu.nodeId) ?? null
    : null
  const canDeleteContextMenuNode = contextMenuNode
    ? contextMenuNode.kind !== 'input' && contextMenuNode.kind !== 'output'
    : false
  const handleContextMenuDelete = () => {
    if (!contextMenu || !canDeleteContextMenuNode) {
      return
    }
    onRemoveNode(contextMenu.nodeId)
    setContextMenu(null)
  }

  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (contextMenuRef.current?.contains(event.target as Node)) {
      return
    }
    setContextMenu(null)
  }

  return (
    <div className={styles.canvasFrame}>
      <main
        aria-label="Graph Canvas"
        className={styles.canvas}
        data-region-id="jJBPL"
        data-can-scroll-x={canScrollX ? 'true' : 'false'}
        data-can-scroll-y={canScrollY ? 'true' : 'false'}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPointerDown={handleCanvasPointerDown}
        ref={canvasRef}
        style={{
          scrollbarColor: canScrollX || canScrollY ? CANVAS_SCROLLBAR_COLOR : HIDDEN_SCROLLBAR_COLOR,
          scrollbarWidth: canScrollX || canScrollY ? 'thin' : 'none',
        }}
      >
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
              onContextMenu={(event) => handleNodeContextMenu(event, node.id)}
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
              onContextMenu={(event) => handleNodeContextMenu(event, node.id)}
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
        const rows = getNodeParamSpecs(node.kind).map((spec) => ({
          key: spec.key,
          label: spec.label,
          value: formatNodeParamValue(node, spec.key),
        }))
        return (
          <div
            className={styles.canvasNode}
            data-testid={`canvas-node-${node.id}`}
            key={node.id}
            onContextMenu={(event) => handleNodeContextMenu(event, node.id)}
            onPointerDown={(event) => handleNodePointerDown(event, node.id, node.x, node.y)}
            style={style}
          >
            <EffectNode
              bypassed={node.bypass}
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
              rows={rows}
              selected={isSelected}
            />
          </div>
        )
        })}
        {contextMenu ? (
          <div
            className={styles.contextMenu}
            ref={contextMenuRef}
            role="menu"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          >
            <button
              className={styles.contextMenuItem}
              disabled={!canDeleteContextMenuNode}
              onClick={handleContextMenuDelete}
              role="menuitem"
              type="button"
            >
              Delete
            </button>
          </div>
        ) : null}
      </main>
      <div className={styles.connectionHint}>
        {pendingFromNodeId ? `Connecting from ${pendingFromNodeId}...` : 'Select OUT then IN to connect'}
      </div>
      {state.lastError ? <div className={styles.canvasError}>{state.lastError}</div> : null}
    </div>
  )
}
