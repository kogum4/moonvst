import { Blocks, LogIn, LogOut } from '../../../../packages/ui-core/src/vendor/lucide'
import { LibItem } from './NodePrimitives'
import type { EffectKind } from './graphUi'
import { EFFECT_LIBRARY } from './graphUi'
import styles from './NodeEditorShell.module.css'

const DRAG_EFFECT_KIND = 'application/x-moonvst-effect-kind'

export function NodePalette({
  onAddNode,
}: {
  onAddNode: (kind: EffectKind) => void
}) {
  return (
    <nav aria-label="Node Library" className={styles.library} data-region-id="XQtg4">
      <div className={styles.libHeader}><Blocks size={14} />NODE LIBRARY</div>
      <div className={styles.sep} />
      <div className={styles.libSection}>I/O</div>
      <LibItem color="#4ADE80" icon={<LogIn size={14} />} label="Stereo Input" />
      <LibItem color="#FB923C" icon={<LogOut size={14} />} label="Stereo Output" />
      <div className={styles.sep} />
      <div className={styles.libSection}>EFFECTS</div>
      {EFFECT_LIBRARY.map((item) => {
        const Icon = item.icon
        return (
          <LibItem
            color={item.color}
            draggable
            icon={<Icon size={14} />}
            key={item.kind}
            label={item.label}
            onClick={() => onAddNode(item.kind)}
            onDragStart={(event) => {
              event.dataTransfer.setData(DRAG_EFFECT_KIND, item.kind)
            }}
          />
        )
      })}
    </nav>
  )
}
