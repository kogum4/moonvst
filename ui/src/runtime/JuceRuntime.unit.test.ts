import { afterEach, describe, expect, test, vi } from 'vitest'
import { createJuceRuntime } from '../../../packages/ui-core/src/runtime/JuceRuntime'

describe('createJuceRuntime', () => {
  afterEach(() => {
    delete (window as Window & { __JUCE__?: unknown }).__JUCE__
    vi.restoreAllMocks()
  })

  test('throws for unsupported bridge shape', async () => {
    ;(window as Window & { __JUCE__?: unknown }).__JUCE__ = {}

    await expect(createJuceRuntime()).rejects.toThrow('Unsupported JUCE bridge shape')
  })

  test('creates runtime from native bridge and handles params', async () => {
    let sliderValue = 0.25
    const listeners = new Set<() => void>()

    const getNativeFunction = (name: string) => {
      if (name === 'getParamCount') return async () => 1
      if (name === 'getParamInfo') return async () => ({ name: 'gain', min: 0, max: 1, defaultValue: 0.2, index: 0 })
      if (name === 'setParam') return async (_index: number, value: number) => { sliderValue = value }
      if (name === 'getLevel') return async () => 0.4
      return async () => 0
    }

    const getSliderState = () => ({
      getValue: () => sliderValue,
      setValue: (v: number) => {
        sliderValue = v
        listeners.forEach((cb) => cb())
      },
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
    })

    ;(window as Window & { __JUCE__?: unknown }).__JUCE__ = {
      getNativeFunction,
      getSliderState,
    }

    const runtime = await createJuceRuntime()

    expect(runtime.type).toBe('juce')
    expect(runtime.getParams()).toHaveLength(1)

    runtime.setParam(0, 0.8)
    expect(runtime.getParam(0)).toBe(0.8)

    const onChange = vi.fn()
    const off = runtime.onParamChange(0, onChange)
    getSliderState().setValue(0.6)
    expect(onChange).toHaveBeenCalledWith(0.6)

    off()
    runtime.dispose()
  })
})
