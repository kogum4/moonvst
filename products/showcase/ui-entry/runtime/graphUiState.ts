import { deserializeGraphPayload, serializeGraphPayload } from './graphContract'
import { createDefaultGraphState } from '../state/graphReducer'
import type { GraphState, NodeKind } from '../state/graphTypes'

const STORAGE_KEY = 'moonvst:showcase:ui-state:v1'
const PRESET_STORAGE_KEY = 'moonvst:showcase:presets:v1'
const MAX_PRESETS = 32

export interface ShowcaseUiStateV1 {
  version: 1
  graphPayload: string
  lastPresetName: string
}

export interface ShowcasePresetRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  graphPayload: string
}

interface GraphPayloadNode {
  id: string
  kind: NodeKind
  x: number
  y: number
  bypass: boolean
  params: Record<string, number>
}

interface GraphPayloadEdge {
  fromNodeId: string
  toNodeId: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseSerial = (id: string): number => {
  const match = /^fx-(\d+)$/.exec(id)
  if (!match) {
    return 0
  }
  return Number.parseInt(match[1], 10)
}

const toGraphState = (nodes: GraphPayloadNode[], edges: GraphPayloadEdge[]): GraphState => {
  const defaultState = createDefaultGraphState()
  const maxSerial = nodes.reduce((max, node) => Math.max(max, parseSerial(node.id)), 0)
  return {
    ...defaultState,
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      x: node.x,
      y: node.y,
      bypass: node.bypass,
      params: { ...node.params },
    })),
    edges: edges.map((edge) => ({
      id: `edge-${edge.fromNodeId}-${edge.toNodeId}`,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
    })),
    selectedNodeId: null,
    lastError: null,
    nextNodeSerial: Math.max(1, maxSerial + 1),
  }
}

export function serializeShowcaseUiState(state: GraphState, lastPresetName = 'Default Preset'): ShowcaseUiStateV1 {
  return {
    version: 1,
    graphPayload: serializeGraphPayload(state),
    lastPresetName,
  }
}

export function deserializeShowcaseUiState(value: unknown): { graphState: GraphState; lastPresetName: string } | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.graphPayload !== 'string') {
    return null
  }
  const payload = deserializeGraphPayload(value.graphPayload)
  const graphState = toGraphState(payload.nodes, payload.edges)
  const lastPresetName = typeof value.lastPresetName === 'string' && value.lastPresetName.trim() !== ''
    ? value.lastPresetName
    : 'Default Preset'
  return { graphState, lastPresetName }
}

export function loadGraphStateFromStorage(storage: Pick<Storage, 'getItem'>): { graphState: GraphState; lastPresetName: string } | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as unknown
    return deserializeShowcaseUiState(parsed)
  } catch {
    return null
  }
}

export function saveGraphStateToStorage(storage: Pick<Storage, 'setItem'>, state: GraphState, lastPresetName: string): void {
  const payload = serializeShowcaseUiState(state, lastPresetName)
  storage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function loadPresetsFromStorage(storage: Pick<Storage, 'getItem'>): ShowcasePresetRecord[] {
  try {
    const raw = storage.getItem(PRESET_STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((item): item is ShowcasePresetRecord =>
        isRecord(item)
        && typeof item.id === 'string'
        && typeof item.name === 'string'
        && typeof item.createdAt === 'number'
        && typeof item.updatedAt === 'number'
        && typeof item.graphPayload === 'string',
      )
      .slice(0, MAX_PRESETS)
  } catch {
    return []
  }
}

export function savePresetsToStorage(storage: Pick<Storage, 'setItem'>, presets: ShowcasePresetRecord[]): void {
  storage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)))
}

export function upsertPreset(
  presets: ShowcasePresetRecord[],
  name: string,
  state: GraphState,
  now = Date.now(),
): ShowcasePresetRecord[] {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return presets
  }
  const graphPayload = serializeGraphPayload(state)
  const existing = presets.find((preset) => preset.name === trimmedName)
  if (existing) {
    return presets.map((preset) =>
      preset.id === existing.id
        ? { ...preset, graphPayload, updatedAt: now }
        : preset,
    )
  }
  const nextPreset: ShowcasePresetRecord = {
    id: `preset-${now}`,
    name: trimmedName,
    createdAt: now,
    updatedAt: now,
    graphPayload,
  }
  const next = [nextPreset, ...presets]
  return next.slice(0, MAX_PRESETS)
}

export function graphStateFromPreset(preset: ShowcasePresetRecord): GraphState {
  const payload = deserializeGraphPayload(preset.graphPayload)
  return toGraphState(payload.nodes, payload.edges)
}

export const SHOWCASE_UI_STATE_STORAGE_KEY = STORAGE_KEY
export const SHOWCASE_PRESET_STORAGE_KEY = PRESET_STORAGE_KEY
