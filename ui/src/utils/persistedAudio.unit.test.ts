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
})
