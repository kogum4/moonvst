import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { SlidersHorizontal } from '../../../../packages/ui-core/src/vendor/lucide'
import styles from './NodePrimitives.module.css'

const clamp01 = (value: number) => Math.max(0, Math.min(100, value))

export function PortIn({
  ariaLabel = 'IN port',
  color = '#22D3EE',
  nodeId,
  onClick,
  onPointerUp,
}: {
  ariaLabel?: string
  color?: string
  nodeId?: string
  onClick?: () => void
  onPointerUp?: () => void
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={styles.portIn}
      data-node-id={nodeId}
      data-port-side="in"
      data-pencil-id="zGscn"
      data-testid="port-in"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      onPointerUp={(event) => {
        event.stopPropagation()
        onPointerUp?.()
      }}
      type="button"
    >
      <span className={styles.portDot} style={{ backgroundColor: color }} />
      <span className={styles.portLabel}>IN</span>
    </button>
  )
}

export function PortOut({
  ariaLabel = 'OUT port',
  color = '#22D3EE',
  nodeId,
  onClick,
  onPointerDown,
}: {
  ariaLabel?: string
  color?: string
  nodeId?: string
  onClick?: () => void
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={styles.portOut}
      data-node-id={nodeId}
      data-port-side="out"
      data-pencil-id="VLHGQ"
      data-testid="port-out"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
        onPointerDown?.(event)
      }}
      type="button"
    >
      <span className={styles.portLabel}>OUT</span>
      <span className={styles.portDot} style={{ backgroundColor: color }} />
    </button>
  )
}

export function ParamSlider({ color = '#22D3EE', value }: { color?: string; value: number }) {
  const clamped = clamp01(value)

  return (
    <div
      aria-label="Parameter value"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={clamped}
      className={styles.paramSlider}
      data-pencil-id="UQsji"
      role="slider"
    >
      <span className={styles.paramFill} style={{ backgroundColor: color, width: `${clamped}%` }} />
      <span className={styles.paramThumb} style={{ backgroundColor: color, left: `calc(${clamped}% - 5px)` }} />
    </div>
  )
}

export function ParamRow({
  color = '#22D3EE',
  label,
  valueText,
  value,
}: {
  color?: string
  label: string
  valueText: string
  value: number
}) {
  return (
    <div aria-label={`Parameter Row ${label}`} className={styles.paramRow} data-param-color={color} data-pencil-id="n7CSX" role="group">
      <div className={styles.paramTop}>
        <span className={styles.paramLabel}>{label}</span>
        <span className={styles.paramValue} style={{ color }}>{valueText}</span>
      </div>
      <ParamSlider color={color} value={value} />
    </div>
  )
}

export function LibItem({
  color,
  draggable = false,
  icon,
  label,
  onClick,
  onDragStart,
}: {
  color: string
  draggable?: boolean
  icon?: ReactNode
  label: string
  onClick?: () => void
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      className={styles.libItem}
      data-pencil-id="T4R15"
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      type="button"
    >
      <span className={styles.libItemDot} style={{ backgroundColor: color }} />
      {icon ? <span className={styles.libItemIcon}>{icon}</span> : null}
      <span className={styles.libItemText}>{label}</span>
    </button>
  )
}

export function EffectNode({
  selected = false,
  bypassed = false,
  color,
  icon,
  inCount = 1,
  inPortAriaLabel,
  nodeId,
  label,
  onClick,
  onInPortClick,
  onInPortPointerUp,
  onOutPortClick,
  onOutPortPointerDown,
  outCount = 1,
  outPortAriaLabel,
  rows = [
    { key: 'mix', label: 'Mix', value: '100%' },
    { key: 'param1', label: 'Param 1', value: '0.5' },
    { key: 'param2', label: 'Param 2', value: '0.0' },
  ],
}: {
  selected?: boolean
  bypassed?: boolean
  color: string
  icon?: ReactNode
  inCount?: number
  inPortAriaLabel?: string
  nodeId?: string
  label: string
  onClick?: () => void
  onInPortClick?: () => void
  onInPortPointerUp?: () => void
  onOutPortClick?: () => void
  onOutPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  outCount?: number
  outPortAriaLabel?: string
  rows?: Array<{ key: string; label: string; value: string }>
}) {
  const inPorts = Array.from({ length: inCount })
  const outPorts = Array.from({ length: outCount })

  return (
    <article
      aria-label={`Effect Node ${label}`}
      className={`${styles.effectNode} ${bypassed ? styles.nodeBypassed : ''} ${selected ? styles.nodeSelected : ''}`.trim()}
      data-bypassed={bypassed}
      data-pencil-id="TLTED"
      data-selected={selected}
      onClick={onClick}
      role="group"
    >
      <div className={styles.nodeHeader} style={{ backgroundColor: color }}>
        <div className={styles.nodeHeaderLeft}>
          {icon ? <span className={styles.nodeHeaderIcon}>{icon}</span> : <span className={styles.nodeHeaderDot} />}
          <span className={styles.nodeHeaderLabel}>{label}</span>
        </div>
        <span className={styles.bypassToggle} />
      </div>
      <div className={styles.nodeBody}>
        <div className={styles.nodeRows}>
          {rows.map((row) => (
            <div className={styles.inlineRow} key={row.key}>
              <span className={styles.inlineLabel}>{row.label}</span>
              <span className={styles.inlineValue}>{row.value}</span>
            </div>
          ))}
        </div>
        <div className={styles.portsRow}>
          <div className={styles.inPortsGroup}>
            {inPorts.map((_, index) => (
              <PortIn
                ariaLabel={inPortAriaLabel ?? `${label} IN port`}
                key={`in-${index}`}
                nodeId={nodeId}
                onClick={onInPortClick}
                onPointerUp={onInPortPointerUp}
              />
            ))}
          </div>
          <div className={styles.outPortsGroup}>
            {outPorts.map((_, index) => (
              <PortOut
                ariaLabel={outPortAriaLabel ?? `${label} OUT port`}
                key={`out-${index}`}
                nodeId={nodeId}
                onClick={onOutPortClick}
                onPointerDown={onOutPortPointerDown}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export function IONode({
  icon,
  inPortAriaLabel,
  nodeId,
  onClick,
  onInPortClick,
  onInPortPointerUp,
  onOutPortClick,
  onOutPortPointerDown,
  outPortAriaLabel,
  selected = false,
  variant,
}: {
  icon?: ReactNode
  inPortAriaLabel?: string
  nodeId?: string
  onClick?: () => void
  onInPortClick?: () => void
  onInPortPointerUp?: () => void
  onOutPortClick?: () => void
  onOutPortPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  outPortAriaLabel?: string
  selected?: boolean
  variant: 'input' | 'output'
}) {
  const isInput = variant === 'input'
  const label = isInput ? 'INPUT' : 'OUTPUT'
  const color = isInput ? '#4ADE80' : '#FB923C'

  return (
    <article
      aria-label={`I/O Node ${label}`}
      className={`${styles.ioNode} ${selected ? styles.nodeSelected : ''}`.trim()}
      data-pencil-id="3w2LY"
      data-selected={selected}
      data-variant={variant}
      onClick={onClick}
      role="group"
    >
      <div className={styles.nodeHeader} style={{ backgroundColor: color }}>
        <div className={styles.nodeHeaderLeft}>
          {icon ? <span className={styles.nodeHeaderIcon}>{icon}</span> : <span className={styles.nodeHeaderDot} />}
          <span className={styles.nodeHeaderLabel}>{label}</span>
        </div>
        <span className={styles.bypassToggle} />
      </div>
      <div className={styles.nodeBodyIo}>
        <div className={styles.ioInfo}>Stereo L/R</div>
        <div className={styles.inlineRow}>
          <span className={styles.inlineLabel}>Gain</span>
          <span className={styles.inlineValue}>0 dB</span>
        </div>
        <div className={`${styles.ioPortsRow} ${isInput ? styles.ioPortsRowEnd : styles.ioPortsRowStart}`}>
          {isInput ? (
            <PortOut
              ariaLabel={outPortAriaLabel ?? `${label} OUT port`}
              nodeId={nodeId}
              onClick={onOutPortClick}
              onPointerDown={onOutPortPointerDown}
            />
          ) : null}
          {!isInput ? (
            <PortIn
              ariaLabel={inPortAriaLabel ?? `${label} IN port`}
              nodeId={nodeId}
              onClick={onInPortClick}
              onPointerUp={onInPortPointerUp}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function EqNodeLarge() {
  const horizontalDbLines = [
    { key: 'h6', top: 30, opacity: 0.3 },
    { key: 'h3', top: 63, opacity: 0.2 },
    { key: 'h0', top: 97, opacity: 0.5 },
    { key: 'hm3', top: 131, opacity: 0.2 },
    { key: 'hm6', top: 165, opacity: 0.3 },
  ]
  const verticalFreqLines = [
    { key: 'v50', left: 46, opacity: 0.2 },
    { key: 'v100', left: 92, opacity: 0.3 },
    { key: 'v200', left: 138, opacity: 0.2 },
    { key: 'v500', left: 184, opacity: 0.2 },
    { key: 'v1k', left: 230, opacity: 0.3 },
    { key: 'v2k', left: 276, opacity: 0.2 },
    { key: 'v5k', left: 322, opacity: 0.2 },
    { key: 'v10k', left: 368, opacity: 0.3 },
    { key: 'v20k', left: 414, opacity: 0.2 },
  ]
  const freqLabels = [
    { key: 'f20', text: '20', left: 22 },
    { key: 'f50', text: '50', left: 42 },
    { key: 'f100', text: '100', left: 84 },
    { key: 'f200', text: '200', left: 130 },
    { key: 'f500', text: '500', left: 177 },
    { key: 'f1k', text: '1k', left: 226 },
    { key: 'f2k', text: '2k', left: 272 },
    { key: 'f5k', text: '5k', left: 318 },
    { key: 'f10k', text: '10k', left: 361 },
    { key: 'f20k', text: '20k', left: 407 },
  ]

  return (
    <article aria-label="EQ Node Large" className={styles.eqNode} data-pencil-id="Vxv0J" role="group">
      <div className={styles.eqHeader}>
        <div className={styles.eqHeaderLeft}>
          <span className={styles.eqHeaderIcon}><SlidersHorizontal size={14} strokeWidth={2} /></span>
          <span className={styles.eqHeaderTitle}>PARAMETRIC EQ</span>
        </div>
        <div className={styles.eqHeaderRight}>
          <span className={styles.eqHeaderBands}>8 Bands</span>
          <span className={styles.bypassToggle} />
        </div>
      </div>
      <div className={styles.eqGraphArea}>
        {horizontalDbLines.map((line) => (
          <span key={line.key} className={styles.eqGridH} style={{ opacity: line.opacity, top: line.top }} />
        ))}
        {verticalFreqLines.map((line) => (
          <span key={line.key} className={styles.eqGridV} style={{ left: line.left, opacity: line.opacity }} />
        ))}
        <span className={`${styles.dbLabel} ${styles.dbLabelP6}`}>+6</span>
        <span className={`${styles.dbLabel} ${styles.dbLabelP3}`}>+3</span>
        <span className={`${styles.dbLabel} ${styles.dbLabel0}`}>0</span>
        <span className={`${styles.dbLabel} ${styles.dbLabelM3}`}>-3</span>
        <span className={`${styles.dbLabel} ${styles.dbLabelM6}`}>-6</span>
        <svg className={styles.eqCurve} viewBox="0 0 460 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="eqAudioLayer" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22D3EE33" />
              <stop offset="100%" stopColor="#22D3EE00" />
            </linearGradient>
          </defs>
          <path
            className={styles.eqAudioArea}
            d="M0,150 C38,132 78,120 112,126 C144,132 176,148 214,145 C248,142 284,120 316,98 C346,77 372,75 404,101 C430,122 444,141 460,153 L460,200 L0,200 Z"
          />
          <path
            className={styles.eqCurveStroke}
            d="M0,130 C40,130 35,75 80,73 C115,72 130,95 165,102 C200,108 208,148 230,152 C248,155 258,116 284,108 C305,101 317,62 345,49 C370,37 385,66 408,77 C425,85 438,112 460,130"
          />
        </svg>
        <div className={`${styles.eqBand} ${styles.eqBand1}`} />
        <div className={`${styles.eqBand} ${styles.eqBand2}`} />
        <div className={`${styles.eqBand} ${styles.eqBand3}`} />
        <div className={`${styles.eqBand} ${styles.eqBand4}`} />
        <div className={`${styles.eqBand} ${styles.eqBand5}`} />
        <div className={`${styles.eqBand} ${styles.eqBand6}`} />
        <div className={`${styles.eqBand} ${styles.eqBand7}`} />
        <div className={`${styles.eqBand} ${styles.eqBand8}`} />
      </div>
      <div className={styles.eqFreqLabels}>
        {freqLabels.map((label) => <span key={label.key} style={{ left: label.left }}>{label.text}</span>)}
      </div>
      <div className={styles.eqParams}>
        <div><span>FREQ</span><strong>2.5 kHz</strong></div>
        <div><span>GAIN</span><strong>+4.2 dB</strong></div>
        <div><span>Q</span><strong>1.41</strong></div>
        <div><span>TYPE</span><em>Bell</em></div>
      </div>
      <div className={styles.eqPorts}>
        <PortIn />
        <PortOut />
      </div>
    </article>
  )
}
