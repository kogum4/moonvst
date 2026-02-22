import { useReducer, useState } from 'react'
import { createDefaultGraphState, graphReducer } from '../state/graphReducer'
import type { NodeId } from '../state/graphTypes'
import type { EffectKind } from './graphUi'

const fxPlacement = (fxCount: number) => {
  const col = fxCount % 3
  const row = Math.floor(fxCount / 3)
  return {
    x: 220 + col * 200,
    y: 40 + row * 190,
  }
}

export function useGraphInteraction() {
  const [state, dispatch] = useReducer(graphReducer, undefined, () => createDefaultGraphState())
  const [pendingFromNodeId, setPendingFromNodeId] = useState<NodeId | null>(null)

  const addNode = (kind: EffectKind) => {
    const fxCount = state.nodes.filter((node) => node.kind !== 'input' && node.kind !== 'output').length
    dispatch({
      type: 'addNode',
      kind,
      ...fxPlacement(fxCount),
    })
  }

  const addNodeAt = (kind: EffectKind, x: number, y: number) => {
    dispatch({
      type: 'addNode',
      kind,
      x,
      y,
    })
  }

  const startConnection = (fromNodeId: NodeId) => {
    setPendingFromNodeId(fromNodeId)
  }

  const completeConnection = (toNodeId: NodeId) => {
    if (!pendingFromNodeId) {
      return
    }
    dispatch({
      type: 'connect',
      fromNodeId: pendingFromNodeId,
      toNodeId,
    })
    setPendingFromNodeId(null)
  }

  const disconnect = (fromNodeId: NodeId, toNodeId: NodeId) => {
    dispatch({ type: 'disconnect', fromNodeId, toNodeId })
  }

  const selectNode = (nodeId: NodeId | null) => {
    dispatch({ type: 'selectNode', nodeId })
  }

  const moveNode = (nodeId: NodeId, x: number, y: number) => {
    dispatch({ type: 'moveNode', nodeId, x, y })
  }

  const removeNode = (nodeId: NodeId) => {
    const target = state.nodes.find((node) => node.id === nodeId)
    if (!target || target.kind === 'input' || target.kind === 'output') {
      return
    }
    dispatch({ type: 'removeNode', nodeId })
    if (pendingFromNodeId === nodeId) {
      setPendingFromNodeId(null)
    }
  }

  const updateNodeParam = (nodeId: NodeId, key: string, value: number) => {
    dispatch({ type: 'updateNodeParam', nodeId, key, value })
  }

  const toggleNodeBypass = (nodeId: NodeId) => {
    dispatch({ type: 'toggleNodeBypass', nodeId })
  }

  return {
    addNode,
    addNodeAt,
    completeConnection,
    disconnect,
    moveNode,
    removeNode,
    toggleNodeBypass,
    updateNodeParam,
    pendingFromNodeId,
    selectNode,
    startConnection,
    state,
  }
}
