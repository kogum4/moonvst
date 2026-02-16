import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { loadPersistedAudio, savePersistedAudio } from './persistedAudio'

const DB_NAME = 'moonvst-web-audio'

function resetDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

type MockMode =
  | 'success-load'
  | 'success-load-store-exists'
  | 'tx-error-with-error'
  | 'tx-error-fallback'
  | 'req-error-with-error'
  | 'req-error-fallback'

function installIndexedDbMock(mode: MockMode) {
  const original = window.indexedDB
  const createdStores: string[] = []

  const database = {
    objectStoreNames: {
      contains: () => mode === 'success-load-store-exists',
    },
    createObjectStore: (name: string) => {
      createdStores.push(name)
      return {} as IDBObjectStore
    },
    close: () => {},
    transaction: (_name: string, txMode: IDBTransactionMode) => {
      const tx = {
        error:
          mode === 'tx-error-with-error'
            ? new Error(txMode === 'readwrite' ? 'tx-write' : 'tx-read')
            : null,
        oncomplete: undefined as (() => void) | undefined,
        onerror: undefined as (() => void) | undefined,
        objectStore: () => ({
          put: () => {},
          get: () => {
            const req = {
              error: mode === 'req-error-with-error' ? new Error('req-read') : null,
              result: null,
              onsuccess: undefined as (() => void) | undefined,
              onerror: undefined as (() => void) | undefined,
            }

            queueMicrotask(() => {
              if (mode === 'req-error-with-error' || mode === 'req-error-fallback') {
                req.onerror?.()
                return
              }
              req.onsuccess?.()
            })

            return req as unknown as IDBRequest
          },
        }),
      }

      queueMicrotask(() => {
        if (mode === 'tx-error-with-error' || mode === 'tx-error-fallback') {
          tx.onerror?.()
          return
        }
        tx.oncomplete?.()
      })

      return tx as unknown as IDBTransaction
    },
  } as unknown as IDBDatabase

  const factory = {
    open: () => {
      const request = {
        error: null,
        result: database,
        onerror: undefined as (() => void) | undefined,
        onsuccess: undefined as (() => void) | undefined,
        onupgradeneeded: undefined as (() => void) | undefined,
      }

      queueMicrotask(() => {
        request.onupgradeneeded?.()
        request.onsuccess?.()
      })

      return request as unknown as IDBOpenDBRequest
    },
  } as unknown as IDBFactory

  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: factory,
  })

  return {
    restore: () => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        value: original,
      })
    },
    createdStores,
  }
}

describe('persistedAudio', () => {
  beforeEach(async () => {
    await resetDb()
  })

  test('saves and loads audio bytes', async () => {
    const bytes = new Uint8Array([10, 20, 30]).buffer

    await savePersistedAudio({
      name: 'kick.wav',
      mimeType: 'audio/wav',
      bytes,
      updatedAt: 1234,
    })

    const loaded = await loadPersistedAudio()

    expect(loaded).not.toBeNull()
    expect(loaded?.name).toBe('kick.wav')
    expect(loaded?.mimeType).toBe('audio/wav')
    expect(Array.from(new Uint8Array(loaded?.bytes ?? new ArrayBuffer(0)))).toEqual([10, 20, 30])
    expect(loaded?.updatedAt).toBe(1234)
  })

  test('returns null when nothing is saved', async () => {
    const loaded = await loadPersistedAudio()

    expect(loaded).toBeNull()
  })

  test('throws when IndexedDB is unavailable', async () => {
    const original = window.indexedDB
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: undefined,
    })

    await expect(loadPersistedAudio()).rejects.toThrow('IndexedDB is not available')

    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: original,
    })
  })

  test('throws when opening IndexedDB fails', async () => {
    const original = window.indexedDB
    const failingFactory = {
      open: () => {
        const request = {} as IDBOpenDBRequest
        queueMicrotask(() => {
          const trigger = (request as unknown as { onerror?: () => void }).onerror
          if (typeof trigger === 'function') trigger()
        })
        return request
      },
    } as unknown as IDBFactory

    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: failingFactory,
    })

    await expect(loadPersistedAudio()).rejects.toThrow('Failed to open IndexedDB')

    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: original,
    })
  })

  test('creates the object store during DB upgrade when missing', async () => {
    const mocked = installIndexedDbMock('success-load')

    const loaded = await loadPersistedAudio()

    expect(loaded).toBeNull()
    expect(mocked.createdStores).toEqual(['audio'])
    mocked.restore()
  })

  test('does not create store when DB already has it', async () => {
    const mocked = installIndexedDbMock('success-load-store-exists')

    const loaded = await loadPersistedAudio()

    expect(loaded).toBeNull()
    expect(mocked.createdStores).toEqual([])
    mocked.restore()
  })

  test('save surfaces transaction errors with original message', async () => {
    const mocked = installIndexedDbMock('tx-error-with-error')

    await expect(
      savePersistedAudio({
        name: 'a.wav',
        mimeType: 'audio/wav',
        bytes: new ArrayBuffer(1),
        updatedAt: 1,
      }),
    ).rejects.toThrow('tx-write')

    mocked.restore()
  })

  test('save falls back to default transaction error message', async () => {
    const mocked = installIndexedDbMock('tx-error-fallback')

    await expect(
      savePersistedAudio({
        name: 'a.wav',
        mimeType: 'audio/wav',
        bytes: new ArrayBuffer(1),
        updatedAt: 1,
      }),
    ).rejects.toThrow('Failed to write persisted audio')

    mocked.restore()
  })

  test('load surfaces transaction errors with original message', async () => {
    const mocked = installIndexedDbMock('tx-error-with-error')

    await expect(loadPersistedAudio()).rejects.toThrow('tx-read')

    mocked.restore()
  })

  test('load falls back to default transaction error message', async () => {
    const mocked = installIndexedDbMock('tx-error-fallback')

    await expect(loadPersistedAudio()).rejects.toThrow('Failed to read persisted audio')

    mocked.restore()
  })

  test('load surfaces request errors with original message', async () => {
    const mocked = installIndexedDbMock('req-error-with-error')

    await expect(loadPersistedAudio()).rejects.toThrow('req-read')

    mocked.restore()
  })

  test('load falls back to default request error message', async () => {
    const mocked = installIndexedDbMock('req-error-fallback')

    await expect(loadPersistedAudio()).rejects.toThrow('Failed to read persisted audio')

    mocked.restore()
  })
})
