import { describe, expect, test } from 'vitest'
import { createDefaultGraphState, graphReducer } from '../state/graphReducer'
import {
  deserializeShowcaseUiState,
  graphStateFromPreset,
  loadGraphStateFromStorage,
  loadPresetsFromStorage,
  saveGraphStateToStorage,
  savePresetsToStorage,
  serializeShowcaseUiState,
  upsertPreset,
} from './graphUiState'

describe('showcase ui state persistence', () => {
  test('serializes and deserializes graph state', () => {
    let state = createDefaultGraphState()
    state = graphReducer(state, { type: 'addNode', kind: 'chorus', x: 220, y: 140, id: 'fx-1' })
    state = graphReducer(state, { type: 'connect', fromNodeId: 'input', toNodeId: 'fx-1' })

    const serialized = serializeShowcaseUiState(state, 'My Preset')
    const restored = deserializeShowcaseUiState(serialized)

    expect(restored).not.toBeNull()
    expect(restored?.lastPresetName).toBe('My Preset')
    expect(restored?.graphState.nodes.some((node) => node.id === 'fx-1')).toBe(true)
  })

  test('loads and saves ui state from storage', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }

    const state = createDefaultGraphState()
    saveGraphStateToStorage(storage, state, 'Default Preset')
    const loaded = loadGraphStateFromStorage(storage)

    expect(loaded).not.toBeNull()
    expect(loaded?.graphState.nodes.map((node) => node.id)).toEqual(['input', 'output'])
  })

  test('upserts and loads presets', () => {
    const state = createDefaultGraphState()
    const first = upsertPreset([], 'Clean', state, 100)
    const second = upsertPreset(first, 'Clean', state, 200)

    expect(second).toHaveLength(1)
    expect(second[0].updatedAt).toBe(200)

    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }

    savePresetsToStorage(storage, second)
    const loadedPresets = loadPresetsFromStorage(storage)
    expect(loadedPresets).toHaveLength(1)

    const restoredState = graphStateFromPreset(loadedPresets[0])
    expect(restoredState.nodes.map((node) => node.id)).toEqual(['input', 'output'])
  })
})
