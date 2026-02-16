import type { ReactNode } from 'react'
import styles from '../../../ui/src/App.module.css'

type RuntimeBase = {
  type: 'juce' | 'web'
}

type ProductShellProps = {
  runtime: RuntimeBase | null
  error: string | null
  children: ReactNode
}

export function ProductShell({ runtime, error, children }: ProductShellProps) {
  if (error) {
    return <div className={styles.error}>Audio runtime init failed: {error}</div>
  }

  if (!runtime) {
    return <div className={styles.loading}>Loading audio runtime...</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MoonVST</h1>
      <div className={styles.controls}>{children}</div>
      <div className={styles.info}>Runtime: {runtime.type}</div>
    </div>
  )
}
