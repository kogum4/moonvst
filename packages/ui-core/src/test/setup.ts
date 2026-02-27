import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>

const isStorageLike = (value: unknown): value is StorageLike => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<StorageLike>
  return (
    typeof candidate.getItem === 'function'
    && typeof candidate.setItem === 'function'
    && typeof candidate.removeItem === 'function'
    && typeof candidate.clear === 'function'
  )
}

const createMemoryStorage = (): StorageLike => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

const ensureStorage = (name: 'localStorage' | 'sessionStorage'): StorageLike => {
  const current = window[name]
  if (isStorageLike(current)) {
    return current
  }

  const fallback = createMemoryStorage()
  Object.defineProperty(window, name, {
    configurable: true,
    value: fallback,
    writable: true,
  })
  return fallback
}

beforeEach(() => {
  ensureStorage('localStorage').clear()
  ensureStorage('sessionStorage').clear()
})

afterEach(() => {
  cleanup()
})
