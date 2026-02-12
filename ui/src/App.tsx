import { useRuntime } from './runtime/useRuntime'
import { GainSlider } from './components/GainSlider'
import { LevelMeter } from './components/LevelMeter'
import styles from './App.module.css'

export default function App() {
  const { runtime, error } = useRuntime()

  if (error) {
    return <div className={styles.error}>Audio runtime init failed: {error}</div>
  }

  if (!runtime) {
    return <div className={styles.loading}>Loading audio runtime...</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>WebVST</h1>
      <div className={styles.controls}>
        <GainSlider runtime={runtime} />
        <LevelMeter runtime={runtime} />
      </div>
      <div className={styles.info}>
        Runtime: {runtime.type}
      </div>
    </div>
  )
}
