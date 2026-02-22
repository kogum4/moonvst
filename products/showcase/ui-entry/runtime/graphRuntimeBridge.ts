import type { AudioRuntime } from '../../../../packages/ui-core/src/runtime/types'
import type { GraphState } from '../state/graphTypes'
import { compileRuntimeGraphPayload, serializeGraphPayload } from './graphContract'
import { toParamBankWrites, validateRuntimeGraphSchema } from './graphParamBank'

export function emitGraphPayloadToRuntime(runtime: AudioRuntime | null, payload: string, revision: number): void {
  if (!runtime) {
    return
  }
  let graph
  try {
    graph = compileRuntimeGraphPayload(payload)
    validateRuntimeGraphSchema(graph.schemaVersion)
  } catch {
    return
  }

  const writes = toParamBankWrites(graph, revision)
  for (const write of writes) {
    runtime.setParam(write.index, write.value)
  }
}

export function createGraphRuntimeBridge(emit: (payload: string, revision: number) => void) {
  let lastPayload: string | null = null
  let revision = 0

  return {
    sync(state: GraphState): string {
      const nextPayload = serializeGraphPayload(state)
      if (nextPayload !== lastPayload) {
        revision += 1
        emit(nextPayload, revision)
        lastPayload = nextPayload
      }
      return nextPayload
    },
  }
}
