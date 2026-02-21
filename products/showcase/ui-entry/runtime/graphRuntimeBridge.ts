import type { AudioRuntime } from '../../../../packages/ui-core/src/runtime/types'
import type { GraphState } from '../state/graphTypes'
import { serializeGraphPayload } from './graphContract'
import { GRAPH_CONTRACT_EVENT_ID } from './graphContractConstants'

type JuceEventBridge = {
  emitEvent(eventId: string, payload: unknown): void
}

const asJuceEventBridge = (candidate: unknown): JuceEventBridge | null => {
  if (
    candidate
    && typeof candidate === 'object'
    && 'emitEvent' in candidate
    && typeof (candidate as JuceEventBridge).emitEvent === 'function'
  ) {
    return candidate as JuceEventBridge
  }
  return null
}

export function emitGraphPayloadToRuntime(runtime: AudioRuntime | null, payload: string): void {
  if (runtime?.type !== 'juce') {
    return
  }
  const bridge = window.__JUCE__
  const eventBridge = asJuceEventBridge(bridge?.backend) ?? asJuceEventBridge(bridge)
  eventBridge?.emitEvent(GRAPH_CONTRACT_EVENT_ID, { payload })
}

export function createGraphRuntimeBridge(emit: (payload: string) => void) {
  let lastPayload: string | null = null

  return {
    sync(state: GraphState): string {
      const nextPayload = serializeGraphPayload(state)
      if (nextPayload !== lastPayload) {
        emit(nextPayload)
        lastPayload = nextPayload
      }
      return nextPayload
    },
  }
}
