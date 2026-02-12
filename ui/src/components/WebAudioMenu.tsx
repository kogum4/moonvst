import { useEffect, useRef, useState } from 'react'
import type { WebAudioRuntime } from '../runtime/types'
import { loadPersistedAudio, savePersistedAudio } from '../utils/persistedAudio'
import styles from './WebAudioMenu.module.css'

type Props = {
  runtime: WebAudioRuntime
}

export function WebAudioMenu({ runtime }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(runtime.getIsPlaying())
  const [hasAudio, setHasAudio] = useState(runtime.hasAudioLoaded())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsPlaying(runtime.getIsPlaying())
    setHasAudio(runtime.hasAudioLoaded())
  }, [runtime])

  useEffect(() => {
    let disposed = false

    const restorePersistedAudio = async () => {
      try {
        const persisted = await loadPersistedAudio()
        if (!persisted || disposed) return
        await runtime.loadAudioData(persisted.bytes.slice(0), persisted.mimeType)
        if (disposed) return
        setFileName(persisted.name)
        setHasAudio(true)
        setIsPlaying(false)
      } catch {
        // Ignore persistence recovery errors and keep normal file-pick flow.
      }
    }

    void restorePersistedAudio()

    return () => {
      disposed = true
    }
  }, [runtime])

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setError(null)
      const bytes = await file.arrayBuffer()
      await runtime.loadAudioData(bytes.slice(0), file.type)
      await savePersistedAudio({
        name: file.name,
        mimeType: file.type,
        bytes,
        updatedAt: Date.now(),
      })
      setFileName(file.name)
      setHasAudio(true)
      setIsPlaying(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setHasAudio(false)
      setIsPlaying(false)
    } finally {
      event.target.value = ''
    }
  }

  const togglePlayback = async () => {
    if (!hasAudio) return

    try {
      setError(null)
      if (runtime.getIsPlaying()) {
        runtime.stop()
        setIsPlaying(false)
      } else {
        await runtime.play()
        setIsPlaying(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setIsPlaying(false)
    }
  }

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle audio menu"
        aria-expanded={isOpen}
      >
        <span className={styles.line} />
        <span className={styles.line} />
        <span className={styles.line} />
      </button>

      {isOpen ? <button type="button" className={styles.overlay} onClick={() => setIsOpen(false)} aria-label="Close audio menu" /> : null}

      <aside className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        <h2 className={styles.heading}>Audio Source</h2>

        <input
          ref={fileInputRef}
          className={styles.hiddenInput}
          type="file"
          accept="audio/*"
          onChange={onFileSelected}
        />

        <button type="button" className={styles.button} onClick={openFilePicker}>
          Choose File
        </button>

        <p className={styles.fileName}>{fileName ?? 'No file selected'}</p>

        <button
          type="button"
          className={`${styles.button} ${hasAudio ? (isPlaying ? styles.stop : styles.play) : styles.disabled}`}
          onClick={() => { void togglePlayback() }}
          disabled={!hasAudio}
        >
          {isPlaying ? 'Stop' : 'Play'}
        </button>

        {error ? <p className={styles.error}>{error}</p> : null}
      </aside>
    </div>
  )
}
