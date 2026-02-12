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
  const withTimeout = async <T>(promise: Promise<T>, label: string, timeoutMs = 4000): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
      })
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  const waitForJuceBridge = async (timeoutMs = 4000, intervalMs = 25) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (window.__JUCE__) return window.__JUCE__
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    return undefined
  }

  const juce = await waitForJuceBridge()
  if (!juce) throw new Error('JUCE bridge not available (timeout)')

  const getParamCount = juce.getNativeFunction('getParamCount')
  const getParamInfo = juce.getNativeFunction('getParamInfo')
  const setParamNative = juce.getNativeFunction('setParam')
  juce.getNativeFunction('getParam')

  // Fetch all parameter info at init
  const count = (await withTimeout(getParamCount() as Promise<number>, 'getParamCount')) as number
  const params: ParamInfo[] = []

  for (let i = 0; i < count; i++) {
    const info = (await withTimeout(getParamInfo(i) as Promise<{
      name: string
      min: number
      max: number
      defaultValue: number
      index: number
    }>, `getParamInfo(${i})`)) as {
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

  const getRelayName = (index: number) => `param_${index}`

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
      const slider = juce.getSliderState(getRelayName(p.index))
      return slider.getValue()
    },

    onParamChange(index: number, cb: (v: number) => void) {
      const p = params[index]
      if (!p) return () => {}

      const slider = juce.getSliderState(getRelayName(p.index))
      const listener = () => cb(slider.getValue())
      slider.addListener(listener)
      return () => slider.removeListener(listener)
    },

    dispose() {
      // Nothing to clean up
    },
  }
}
