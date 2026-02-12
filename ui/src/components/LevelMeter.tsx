import { useEffect, useState } from 'react'
import type { AudioRuntime } from '../runtime/types'
import styles from './LevelMeter.module.css'

interface Props {
  runtime: AudioRuntime
}

export function LevelMeter({ runtime }: Props) {
  const [level, setLevel] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      const next = runtime.getLevel()
      setLevel(Math.max(0, Math.min(1, next)))
    }, 50)

    return () => clearInterval(id)
  }, [runtime])

  return (
    <div className={styles.container}>
      <div className={styles.label}>Level</div>
      <div className={styles.meterTrack}>
        <div className={styles.meterFill} style={{ width: `${(level * 100).toFixed(1)}%` }} />
      </div>
      <div className={styles.hint}>{level.toFixed(3)}</div>
    </div>
  )
}
