import type { AudioRuntime, ParamInfo } from './types'

declare global {
  interface Window {
    __JUCE__?: {
      getNativeFunction(name: string): (...args: unknown[]) => Promise<unknown>
      getSliderState(name: string): {
        getValue(): number
        setValue(v: number): void
        addListener(cb: () => void): void
        removeListener(cb: () => void): void
      }
    }
  }
}

export async function createJuceRuntime(): Promise<AudioRuntime> {
  const juce = window.__JUCE__
  if (!juce) throw new Error('JUCE bridge not available')

  const getParamCount = juce.getNativeFunction('getParamCount')
  const getParamInfo = juce.getNativeFunction('getParamInfo')
  const setParamNative = juce.getNativeFunction('setParam')
  const getParamNative = juce.getNativeFunction('getParam')

  // Fetch all parameter info at init
  const count = (await getParamCount()) as number
  const params: ParamInfo[] = []

  for (let i = 0; i < count; i++) {
    const info = (await getParamInfo(i)) as {
      name: string
      min: number
      max: number
      defaultValue: number
      index: number
    }
    params.push({
      index: info.index,
      name: info.name,
      min: info.min,
      max: info.max,
      defaultValue: info.defaultValue,
    })
  }

  return {
    type: 'juce',

    getParams() {
      return params
    },

    setParam(index: number, value: number) {
      setParamNative(index, value)
    },

    getParam(index: number) {
      const p = params[index]
      if (!p) return 0
      const slider = juce.getSliderState(p.name)
      return slider.getValue()
    },

    onParamChange(index: number, cb: (v: number) => void) {
      const p = params[index]
      if (!p) return () => {}

      const slider = juce.getSliderState(p.name)
      const listener = () => cb(slider.getValue())
      slider.addListener(listener)
      return () => slider.removeListener(listener)
    },

    dispose() {
      // Nothing to clean up
    },
  }
}
