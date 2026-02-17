import { useState, useEffect } from 'react'
import type { AudioRuntime } from './types'

function isJuceEnvironment(): boolean {
  return typeof window !== 'undefined' && window.__JUCE__ !== undefined
}

export function useRuntime() {
  const [runtime, setRuntime] = useState<AudioRuntime | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let createdRuntime: AudioRuntime | null = null

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

        if (disposed) {
          rt.dispose()
          return
        }
        createdRuntime = rt
        setRuntime(rt)
      } catch (err) {
        console.error('Failed to initialize audio runtime:', err)
        if (!disposed) {
          const message = err instanceof Error ? err.message : String(err)
          setError(message)
        }
      }
    }

    init()

    return () => {
      disposed = true
      createdRuntime?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { runtime, error }
}
