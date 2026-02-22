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
      backend?: {
        addEventListener(eventId: string, listener: (event: any) => void): any
        removeEventListener?(removalToken: any): void
        emitEvent(eventId: string, payload: any): void
      }
    }
  }
}

export async function createJuceRuntime(): Promise<AudioRuntime> {
  type SliderState = {
    getValue(): number
    setValue(v: number): void
    addListener(cb: () => void): void
    removeListener(cb: () => void): void
  }

  type JuceBridgeCompat = {
    getNativeFunction(name: string): (...args: unknown[]) => Promise<unknown>
    getSliderState(name: string): SliderState
  }

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

  const adaptBridge = (raw: NonNullable<Window['__JUCE__']>): JuceBridgeCompat => {
    const asEventBridge = (candidate: any) => {
      if (
        candidate
        && typeof candidate.addEventListener === 'function'
        && typeof candidate.emitEvent === 'function'
      ) {
        return candidate as { addEventListener(eventId: string, listener: (event: any) => void): any; emitEvent(eventId: string, payload: any): void }
      }
      return undefined
    }

    if (typeof raw.getNativeFunction === 'function' && typeof raw.getSliderState === 'function') {
      return {
        getNativeFunction: raw.getNativeFunction.bind(raw),
        getSliderState: raw.getSliderState.bind(raw),
      }
    }

    // Some JUCE/bridge variants expose getNativeFunction but not getSliderState.
    // Provide a slider-state shim using getParam/setParam when possible.
    if (typeof raw.getNativeFunction === 'function') {
      const getNativeFunction = raw.getNativeFunction.bind(raw)
      const sliderCache = new Map<string, SliderState>()
      const pollers = new Map<string, ReturnType<typeof setInterval>>()
      const parseIndex = (name: string) => {
        const m = /^param_(\d+)$/.exec(name)
        return m ? Number(m[1]) : -1
      }

      const getSliderState = (name: string): SliderState => {
        const existing = sliderCache.get(name)
        if (existing) return existing

        const index = parseIndex(name)
        let value = 0
        const listeners = new Set<() => void>()
        const getParam = getNativeFunction('getParam')
        const setParam = getNativeFunction('setParam')

        const notifyIfChanged = async () => {
          if (index < 0) return
          try {
            const next = Number(await getParam(index))
            if (!Number.isFinite(next) || next === value) return
            value = next
            listeners.forEach((cb) => cb())
          } catch {
            // Ignore transient backend fetch failures.
          }
        }

        const state: SliderState = {
          getValue: () => value,
          setValue: (v: number) => {
            value = v
            if (index >= 0) void setParam(index, v)
          },
          addListener: (cb: () => void) => {
            listeners.add(cb)
            if (!pollers.has(name)) {
              void notifyIfChanged()
              pollers.set(name, setInterval(() => {
                void notifyIfChanged()
              }, 100))
            }
          },
          removeListener: (cb: () => void) => {
            listeners.delete(cb)
            if (listeners.size === 0) {
              const id = pollers.get(name)
              if (id) clearInterval(id)
              pollers.delete(name)
            }
          },
        }

        sliderCache.set(name, state)
        return state
      }

      return { getNativeFunction, getSliderState }
    }

    const backend = asEventBridge(raw.backend) ?? asEventBridge(raw as any)
    if (!backend) {
      const keys = Object.keys(raw as Record<string, unknown>).join(',')
      throw new Error(`Unsupported JUCE bridge shape (keys: ${keys})`)
    }

    let nextPromiseId = 1
    const pending = new Map<number, (value: unknown) => void>()
    backend.addEventListener('__juce__complete', (event: any) => {
      const id = Number(event?.promiseId)
      const resolve = pending.get(id)
      if (!resolve) return
      pending.delete(id)
      resolve(event?.result)
    })

    const sliderCache = new Map<string, SliderState>()
    const getSliderState = (name: string): SliderState => {
      const existing = sliderCache.get(name)
      if (existing) return existing

      const eventId = `__juce__slider${name}`
      let value = 0
      const listeners = new Set<() => void>()

      backend.addEventListener(eventId, (event: any) => {
        if (event?.eventType === 'valueChanged') {
          value = Number(event.value ?? 0)
          listeners.forEach((cb) => cb())
        }
      })

      backend.emitEvent(eventId, { eventType: 'requestInitialUpdate' })

      const state: SliderState = {
        getValue: () => value,
        setValue: (v: number) => {
          value = v
          backend.emitEvent(eventId, { eventType: 'valueChanged', value: v })
        },
        addListener: (cb: () => void) => {
          listeners.add(cb)
        },
        removeListener: (cb: () => void) => {
          listeners.delete(cb)
        },
      }

      sliderCache.set(name, state)
      return state
    }

    const getNativeFunction = (name: string) => (...args: unknown[]) =>
      new Promise<unknown>((resolve) => {
        const promiseId = nextPromiseId++
        pending.set(promiseId, resolve)
        backend.emitEvent('__juce__invoke', { name, params: args, resultId: promiseId })
      })

    return { getNativeFunction, getSliderState }
  }

  const bridge = adaptBridge(juce)

  const getParamCount = bridge.getNativeFunction('getParamCount')
  const getParamInfo = bridge.getNativeFunction('getParamInfo')
  const setParamNative = bridge.getNativeFunction('setParam')
  const getLevelNative = bridge.getNativeFunction('getLevel')

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
  let currentLevel = 0
  const pollLevel = async () => {
    try {
      const raw = Number(await (getLevelNative() as Promise<number>))
      if (Number.isFinite(raw))
        currentLevel = Math.max(0, Math.min(1, raw))
    } catch {
      // Ignore transient bridge failures.
    }
  }
  void pollLevel()
  const levelTimer = setInterval(() => {
    void pollLevel()
  }, 50)

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
      const slider = bridge.getSliderState(getRelayName(p.index))
      return slider.getValue()
    },

    getLevel() {
      return currentLevel
    },

    onParamChange(index: number, cb: (v: number) => void) {
      const p = params[index]
      if (!p) return () => {}

      const slider = bridge.getSliderState(getRelayName(p.index))
      const listener = () => cb(slider.getValue())
      slider.addListener(listener)
      return () => slider.removeListener(listener)
    },

    dispose() {
      clearInterval(levelTimer)
    },
  }
}
