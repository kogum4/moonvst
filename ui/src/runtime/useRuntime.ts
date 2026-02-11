import { useState, useEffect } from 'react'
import type { AudioRuntime } from './types'

function isJuceEnvironment(): boolean {
  return typeof window !== 'undefined' && window.__JUCE__ !== undefined
}

export function useRuntime(): AudioRuntime | null {
  const [runtime, setRuntime] = useState<AudioRuntime | null>(null)

  useEffect(() => {
    let disposed = false

    async function init() {
      try {
        let rt: AudioRuntime

        if (isJuceEnvironment() || import.meta.env.VITE_RUNTIME === 'juce') {
          const { createJuceRuntime } = await import('./JuceRuntime')
          rt = await createJuceRuntime()
        } else {
          const { createWebRuntime } = await import('./WebRuntime')
          rt = await createWebRuntime()
        }

        if (!disposed) setRuntime(rt)
      } catch (err) {
        console.error('Failed to initialize audio runtime:', err)
      }
    }

    init()

    return () => {
      disposed = true
      runtime?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return runtime
}
