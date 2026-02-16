import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useRuntime } from '../../../packages/ui-core/src/runtime/useRuntime'
import { createJuceRuntime } from '../../../packages/ui-core/src/runtime/JuceRuntime'
import { createWebRuntime } from '../../../packages/ui-core/src/runtime/WebRuntime'

vi.mock('../../../packages/ui-core/src/runtime/JuceRuntime', () => ({
  createJuceRuntime: vi.fn(),
}))

vi.mock('../../../packages/ui-core/src/runtime/WebRuntime', () => ({
  createWebRuntime: vi.fn(),
}))

const mockedCreateJuceRuntime = vi.mocked(createJuceRuntime)
const mockedCreateWebRuntime = vi.mocked(createWebRuntime)

const runtimeStub = {
  type: 'web' as const,
  getParams: () => [],
  setParam: () => {},
  getParam: () => 0,
  getLevel: () => 0,
  onParamChange: () => () => {},
  loadAudioData: async () => {},
  loadAudioFile: async () => {},
  play: async () => {},
  stop: () => {},
  startMic: async () => {},
  stopMic: () => {},
  hasAudioLoaded: () => false,
  getIsPlaying: () => false,
  getInputMode: () => 'none' as const,
  getMicState: () => 'inactive' as const,
  dispose: vi.fn(),
}

describe('useRuntime', () => {
  beforeEach(() => {
    mockedCreateJuceRuntime.mockReset()
    mockedCreateWebRuntime.mockReset()
    delete (window as Window & { __JUCE__?: unknown }).__JUCE__
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('initializes web runtime by default', async () => {
    mockedCreateWebRuntime.mockResolvedValue(runtimeStub)

    const { result } = renderHook(() => useRuntime())

    await waitFor(() => {
      expect(result.current.runtime).toBe(runtimeStub)
    })
    expect(mockedCreateWebRuntime).toHaveBeenCalled()
    expect(mockedCreateJuceRuntime).not.toHaveBeenCalled()
  })

  test('initializes juce runtime when JUCE bridge exists', async () => {
    const juceRuntime = { ...runtimeStub, type: 'juce' as const }
    ;(window as Window & { __JUCE__?: unknown }).__JUCE__ = {}
    mockedCreateJuceRuntime.mockResolvedValue(juceRuntime)

    const { result } = renderHook(() => useRuntime())

    await waitFor(() => {
      expect(result.current.runtime).toBe(juceRuntime)
    })
    expect(mockedCreateJuceRuntime).toHaveBeenCalled()
    expect(mockedCreateWebRuntime).not.toHaveBeenCalled()
  })

  test('exposes init errors', async () => {
    mockedCreateWebRuntime.mockRejectedValue(new Error('init failed'))

    const { result } = renderHook(() => useRuntime())

    await waitFor(() => {
      expect(result.current.error).toBe('init failed')
    })
  })

  test('disposes created runtime on unmount', async () => {
    const dispose = vi.fn()
    mockedCreateWebRuntime.mockResolvedValue({ ...runtimeStub, dispose })

    const { result, unmount } = renderHook(() => useRuntime())

    await waitFor(() => {
      expect(result.current.runtime).not.toBeNull()
    })

    unmount()
    expect(dispose).toHaveBeenCalled()
  })
})
