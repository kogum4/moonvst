import { useCallback, useReducer, useState } from 'react'
import { createDefaultGraphState } from '../state/graphReducer'
import { createGraphHistoryState, graphHistoryReducer } from '../state/graphHistory'
import type { GraphAction, GraphState, NodeId } from '../state/graphTypes'
import type { EffectKind } from './graphUi'

const fxPlacement = (fxCount: number) => {
  const col = fxCount % 3
  const row = Math.floor(fxCount / 3)
  return {
    x: 220 + col * 200,
    y: 40 + row * 190,
  }
}

export function useGraphInteraction(initialState?: GraphState) {
  const [historyState, dispatch] = useReducer(graphHistoryReducer, undefined, () =>
    createGraphHistoryState(initialState ?? createDefaultGraphState()),
  )
  const [pendingFromNodeId, setPendingFromNodeId] = useState<NodeId | null>(null)
  const state = historyState.present

  const dispatchGraph = useCallback((action: GraphAction) => {
    dispatch({ type: 'graph', action, trackHistory: true })
  }, [])

  const addNode = (kind: EffectKind) => {
    const fxCount = state.nodes.filter((node) => node.kind !== 'input' && node.kind !== 'output').length
    dispatchGraph({
      type: 'addNode',
      kind,
      ...fxPlacement(fxCount),
    })
  }

  const addNodeAt = (kind: EffectKind, x: number, y: number) => {
    dispatchGraph({
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
    dispatchGraph({
      type: 'connect',
      fromNodeId: pendingFromNodeId,
      toNodeId,
    })
    setPendingFromNodeId(null)
  }

  const disconnect = (fromNodeId: NodeId, toNodeId: NodeId) => {
    dispatchGraph({ type: 'disconnect', fromNodeId, toNodeId })
  }

  const selectNode = (nodeId: NodeId | null) => {
    dispatch({ type: 'graph', action: { type: 'selectNode', nodeId }, trackHistory: false })
  }

  const moveNode = (nodeId: NodeId, x: number, y: number) => {
    dispatchGraph({ type: 'moveNode', nodeId, x, y })
  }

  const removeNode = (nodeId: NodeId) => {
    const target = state.nodes.find((node) => node.id === nodeId)
    if (!target || target.kind === 'input' || target.kind === 'output') {
      return
    }
    dispatchGraph({ type: 'removeNode', nodeId })
    if (pendingFromNodeId === nodeId) {
      setPendingFromNodeId(null)
    }
  }

  const updateNodeParam = (nodeId: NodeId, key: string, value: number) => {
    dispatchGraph({ type: 'updateNodeParam', nodeId, key, value })
  }

  const toggleNodeBypass = (nodeId: NodeId) => {
    dispatchGraph({ type: 'toggleNodeBypass', nodeId })
  }

  const undo = () => {
    dispatch({ type: 'undo' })
    setPendingFromNodeId(null)
  }

  const redo = () => {
    dispatch({ type: 'redo' })
    setPendingFromNodeId(null)
  }

  const reset = () => {
    dispatch({ type: 'reset' })
    setPendingFromNodeId(null)
  }

  const replaceState = (nextState: GraphState, trackHistory: boolean) => {
    dispatch({ type: 'replace', state: nextState, trackHistory })
    setPendingFromNodeId(null)
  }

  return {
    addNode,
    addNodeAt,
    completeConnection,
    disconnect,
    moveNode,
    removeNode,
    undo,
    redo,
    reset,
    replaceState,
    toggleNodeBypass,
    updateNodeParam,
    pendingFromNodeId,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
    selectNode,
    startConnection,
    state,
  }
}
