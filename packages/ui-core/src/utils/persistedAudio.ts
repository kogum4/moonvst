const DB_NAME = 'moonvst-web-audio'
const DB_VERSION = 1
const STORE_NAME = 'audio'
const RECORD_KEY = 'latest'

export interface PersistedAudioRecord {
  name: string
  mimeType: string
  bytes: ArrayBuffer
  updatedAt: number
}

function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'))
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

export async function savePersistedAudio(record: PersistedAudioRecord): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Failed to write persisted audio'))
      tx.objectStore(STORE_NAME).put(record, RECORD_KEY)
    })
  } finally {
    db.close()
  }
}

export async function loadPersistedAudio(): Promise<PersistedAudioRecord | null> {
  const db = await openDb()
  try {
    return await new Promise<PersistedAudioRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      tx.onerror = () => reject(tx.error ?? new Error('Failed to read persisted audio'))
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY)
      req.onerror = () => reject(req.error ?? new Error('Failed to read persisted audio'))
      req.onsuccess = () => {
        resolve((req.result as PersistedAudioRecord | undefined) ?? null)
      }
    })
  } finally {
    db.close()
  }
}
