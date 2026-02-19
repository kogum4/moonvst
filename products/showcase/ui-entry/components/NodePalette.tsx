import { Blocks, LogIn, LogOut } from '../../../../packages/ui-core/src/vendor/lucide'
import { LibItem } from './NodePrimitives'
import type { EffectKind } from './graphUi'
import { EFFECT_LIBRARY, getEffectVisual } from './graphUi'
import primitiveStyles from './NodePrimitives.module.css'
import styles from './NodeEditorShell.module.css'

const DRAG_EFFECT_KIND = 'application/x-moonvst-effect-kind'
const DRAG_EFFECT_ANCHOR = 'application/x-moonvst-effect-anchor'
const DRAG_PREVIEW_OFFSET_X = 90
const DRAG_PREVIEW_OFFSET_Y = 16
const EFFECT_PORT_COLOR = '#22D3EE'

const createEffectDragPreview = (kind: EffectKind) => {
  const visual = getEffectVisual(kind)
  const preview = document.createElement('div')
  preview.className = primitiveStyles.effectNode
  preview.style.left = '-9999px'
  preview.style.pointerEvents = 'none'
  preview.style.position = 'fixed'
  preview.style.top = '-9999px'
  preview.style.zIndex = '-1'

  const header = document.createElement('div')
  header.className = primitiveStyles.nodeHeader
  header.style.backgroundColor = visual.color
  preview.appendChild(header)

  const headerLeft = document.createElement('div')
  headerLeft.className = primitiveStyles.nodeHeaderLeft
  header.appendChild(headerLeft)

  const headerDot = document.createElement('span')
  headerDot.className = primitiveStyles.nodeHeaderDot
  headerLeft.appendChild(headerDot)

  const headerLabel = document.createElement('span')
  headerLabel.className = primitiveStyles.nodeHeaderLabel
  headerLabel.textContent = visual.label
  headerLeft.appendChild(headerLabel)

  const bypassToggle = document.createElement('span')
  bypassToggle.className = primitiveStyles.bypassToggle
  header.appendChild(bypassToggle)

  const body = document.createElement('div')
  body.className = primitiveStyles.nodeBody
  preview.appendChild(body)

  const rows = document.createElement('div')
  rows.className = primitiveStyles.nodeRows
  body.appendChild(rows)

  for (const row of visual.rows) {
    const inlineRow = document.createElement('div')
    inlineRow.className = primitiveStyles.inlineRow

    const label = document.createElement('span')
    label.className = primitiveStyles.inlineLabel
    label.textContent = row.label
    inlineRow.appendChild(label)

    const value = document.createElement('span')
    value.className = primitiveStyles.inlineValue
    value.textContent = row.value
    inlineRow.appendChild(value)

    rows.appendChild(inlineRow)
  }

  const portsRow = document.createElement('div')
  portsRow.className = primitiveStyles.portsRow
  body.appendChild(portsRow)

  const inPortsGroup = document.createElement('div')
  inPortsGroup.className = primitiveStyles.inPortsGroup
  portsRow.appendChild(inPortsGroup)

  const inPort = document.createElement('button')
  inPort.className = primitiveStyles.portIn
  inPort.type = 'button'
  const inDot = document.createElement('span')
  inDot.className = primitiveStyles.portDot
  inDot.style.backgroundColor = EFFECT_PORT_COLOR
  const inLabel = document.createElement('span')
  inLabel.className = primitiveStyles.portLabel
  inLabel.textContent = 'IN'
  inPort.appendChild(inDot)
  inPort.appendChild(inLabel)
  inPortsGroup.appendChild(inPort)

  const outPortsGroup = document.createElement('div')
  outPortsGroup.className = primitiveStyles.outPortsGroup
  portsRow.appendChild(outPortsGroup)

  const outPort = document.createElement('button')
  outPort.className = primitiveStyles.portOut
  outPort.type = 'button'
  const outLabel = document.createElement('span')
  outLabel.className = primitiveStyles.portLabel
  outLabel.textContent = 'OUT'
  const outDot = document.createElement('span')
  outDot.className = primitiveStyles.portDot
  outDot.style.backgroundColor = EFFECT_PORT_COLOR
  outPort.appendChild(outLabel)
  outPort.appendChild(outDot)
  outPortsGroup.appendChild(outPort)

  return preview
}

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
              event.dataTransfer.setData(DRAG_EFFECT_ANCHOR, `${DRAG_PREVIEW_OFFSET_X},${DRAG_PREVIEW_OFFSET_Y}`)
              if (typeof event.dataTransfer.setDragImage !== 'function') {
                return
              }
              const preview = createEffectDragPreview(item.kind)
              document.body.appendChild(preview)
              event.dataTransfer.setDragImage(preview, DRAG_PREVIEW_OFFSET_X, DRAG_PREVIEW_OFFSET_Y)
              setTimeout(() => {
                preview.remove()
              }, 0)
            }}
          />
        )
      })}
    </nav>
  )
}
