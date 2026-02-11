import styles from './LevelMeter.module.css'

export function LevelMeter() {
  return (
    <div className={styles.container}>
      <div className={styles.label}>Level</div>
      <div className={styles.meterTrack}>
        <div className={styles.meterFill} style={{ width: '0%' }} />
      </div>
      <div className={styles.hint}>Level metering — future extension point</div>
    </div>
  )
}
