import { useRuntime } from '../../../ui/src/runtime/useRuntime'
import { GainSlider } from '../../../ui/src/components/GainSlider'
import { LevelMeter } from '../../../ui/src/components/LevelMeter'
import { WebAudioMenu } from '../../../ui/src/components/WebAudioMenu'
import type { WebAudioRuntime } from '../../../ui/src/runtime/types'
import styles from '../../../ui/src/App.module.css'

function isWebAudioRuntime(runtime: { type: 'juce' | 'web' }): runtime is WebAudioRuntime {
  return runtime.type === 'web'
}

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
      {isWebAudioRuntime(runtime) ? <WebAudioMenu runtime={runtime} /> : null}
      <h1 className={styles.title}>MoonVST</h1>
      <div className={styles.controls}>
        <GainSlider runtime={runtime} paramName="gain" />
        <LevelMeter runtime={runtime} />
      </div>
      <div className={styles.info}>Runtime: {runtime.type}</div>
    </div>
  )
}
