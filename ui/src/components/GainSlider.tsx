import type { AudioRuntime } from '../runtime/types'
import { useParam } from '../hooks/useParam'
import styles from './GainSlider.module.css'

interface Props {
  runtime: AudioRuntime
}

export function GainSlider({ runtime }: Props) {
  const { value, set, info } = useParam(runtime, 'gain')

  if (!info) return null

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {info.name}
        <span className={styles.value}>{value.toFixed(2)}</span>
      </label>
      <input
        className={styles.slider}
        type="range"
        min={info.min}
        max={info.max}
        step={0.01}
        value={value}
        onChange={e => set(+e.target.value)}
      />
    </div>
  )
}
