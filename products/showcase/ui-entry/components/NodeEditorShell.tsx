import {
  Github,
  Moon,
  RotateCcw,
  Settings2,
  ZoomIn,
} from '../../../../packages/ui-core/src/vendor/lucide'
import '../../../../packages/ui-core/src/styles/showcaseFonts'
import { useEffect, useMemo, type CSSProperties } from 'react'
import type { AudioRuntime } from '../../../../packages/ui-core/src/runtime/types'
import { GraphCanvas } from './GraphCanvas'
import { NodePalette } from './NodePalette'
import { getNodeColor, getNodeLabel } from './graphUi'
import { useGraphInteraction } from './useGraphInteraction'
import type { GraphNode } from '../state/graphTypes'
import {
  formatNodeParamValue,
  getNodeParamSpecs,
  getNodeParamValue,
  isEffectNodeKind,
} from '../state/nodeParamSchema'
import { createGraphRuntimeBridge, emitGraphPayloadToRuntime } from '../runtime/graphRuntimeBridge'
import styles from './NodeEditorShell.module.css'

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
}

const hexToRgbChannels = (hex: string): string => {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized
  const int = Number.parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `${r} ${g} ${b}`
}

const toLogUnit = (value: number, min: number, max: number) => {
  const safeMin = Math.max(min, 1.0e-6)
  const safeValue = Math.max(value, safeMin)
  const logMin = Math.log(safeMin)
  const logMax = Math.log(max)
  if (logMax <= logMin) {
    return 0
  }
  return Math.max(0, Math.min(1, (Math.log(safeValue) - logMin) / (logMax - logMin)))
}

const fromLogUnit = (unit: number, min: number, max: number) => {
  const safeMin = Math.max(min, 1.0e-6)
  const t = Math.max(0, Math.min(1, unit))
  const logMin = Math.log(safeMin)
  const logMax = Math.log(max)
  return Math.exp(logMin + t * (logMax - logMin))
}

function TopBar() {
  return (
    <header aria-label="Top Bar" className={styles.topBar} data-region-id="FMWVd">
      <div className={styles.topLeft}>
        <div className={styles.logoWrap}>
          <Moon className={styles.logoIcon} size={20} strokeWidth={2} />
          <span className={styles.logoText}>MoonVST</span>
        </div>
        <div className={styles.vDivider} />
        <span className={styles.presetName}>Default Preset</span>
      </div>
      <div className={styles.topRight}>
        <a className={styles.ghostButton} href="https://github.com/kogum4/moonvst" rel="noreferrer" target="_blank"><Github className={styles.addNodeIcon} size={14} />GitHub</a>
        <button className={styles.ghostButton} type="button"><RotateCcw className={styles.resetIcon} size={14} />Reset</button>
        <div className={styles.vDivider} />
        <button className={styles.activeButton} type="button"><span className={styles.activeDot} />Active</button>
      </div>
    </header>
  )
}

function InspectorPanel({
  incomingConnections,
  nodeColor,
  onToggleBypass,
  onUpdateParam,
  outgoingConnections,
  selectedNode,
  selectedNodeLabel,
}: {
  incomingConnections: Array<{ color: string; label: string }>
  nodeColor: string
  onToggleBypass: (nodeId: string) => void
  onUpdateParam: (nodeId: string, key: string, value: number) => void
  outgoingConnections: Array<{ color: string; label: string }>
  selectedNode: GraphNode | null
  selectedNodeLabel: string
}) {
  const canEditParams = selectedNode ? isEffectNodeKind(selectedNode.kind) : false
  const paramSpecs = selectedNode ? getNodeParamSpecs(selectedNode.kind) : []
  const selectedNodePosition = selectedNode ? `${selectedNode.x}, ${selectedNode.y}` : '--'
  const nodeColorRgb = hexToRgbChannels(nodeColor)

  return (
    <aside aria-label="Properties Panel" className={styles.inspector} data-region-id="P0JNl">
      <div className={styles.propsHeader}><Settings2 size={14} />PROPERTIES</div>
      <section className={styles.propsSection}>
        <div className={styles.nodeInfoRow}>
          <div className={styles.nodeInfo}>
            <span
              className={styles.nodeDot}
              data-node-color={nodeColor}
              data-testid="inspector-node-dot"
              style={{ backgroundColor: nodeColor }}
            />
            <span className={styles.nodeTitleText}>{selectedNodeLabel}</span>
          </div>
          <button
            aria-label={`Bypass ${selectedNodeLabel}`}
            aria-pressed={selectedNode?.bypass ? 'false' : 'true'}
            className={styles.toggleTrack}
            disabled={!canEditParams || !selectedNode}
            style={{ '--node-color': nodeColor, '--node-color-rgb': nodeColorRgb } as CSSProperties}
            onClick={() => {
              if (!selectedNode || !canEditParams) {
                return
              }
              onToggleBypass(selectedNode.id)
            }}
            type="button"
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
        <div className={styles.monoSub}>Stereo effect | Showcase editor</div>
      </section>
      <section className={styles.propsSection}>
        <div className={styles.sectionLabel}>PARAMETERS</div>
        {canEditParams && selectedNode ? (
          <div className={styles.paramsList}>
            {paramSpecs.map((spec) => {
              const value = getNodeParamValue(selectedNode, spec.key) ?? spec.defaultValue
              const valueText = formatNodeParamValue(selectedNode, spec.key)
              const ratio = spec.scale === 'log'
                ? toLogUnit(value, spec.min, spec.max)
                : (value - spec.min) / (spec.max - spec.min)
              const percent = Math.max(0, Math.min(100, ratio * 100))
              const sliderMin = spec.scale === 'log' ? 0 : spec.min
              const sliderMax = spec.scale === 'log' ? 1 : spec.max
              const sliderStep = spec.scale === 'log' ? 0.001 : (spec.step ?? 1)
              const sliderValue = spec.scale === 'log' ? ratio : value
              return (
                <label
                  className={styles.paramControl}
                  key={spec.key}
                  style={{ '--node-color': nodeColor, '--node-color-rgb': nodeColorRgb } as CSSProperties}
                >
                  <div className={styles.paramControlHead}>
                    <span className={styles.paramLabel}>{spec.label}</span>
                    <span className={styles.paramValue}>{valueText}</span>
                  </div>
                  <div className={styles.paramSliderWrap}>
                    <div className={styles.paramSliderTrack}>
                      <span className={styles.paramSliderFill} style={{ width: `${percent}%` }} />
                      <span className={styles.paramSliderThumb} style={{ left: `calc(${percent}% - 5px)` }} />
                    </div>
                    <input
                      aria-label={spec.label}
                      className={styles.paramSliderInput}
                      max={sliderMax}
                      min={sliderMin}
                      onChange={(event) => {
                        const rawValue = Number(event.target.value)
                        const nextValue = spec.scale === 'log'
                          ? fromLogUnit(rawValue, spec.min, spec.max)
                          : rawValue
                        onUpdateParam(selectedNode.id, spec.key, nextValue)
                      }}
                      step={sliderStep}
                      type="range"
                      value={sliderValue}
                    />
                  </div>
                </label>
              )
            })}
          </div>
        ) : (
          <div className={styles.monoSub}>No editable parameters for current selection.</div>
        )}
      </section>
      <section className={`${styles.propsSection} ${styles.connectionsSection}`}>
        <div className={styles.connectionsHeaderWrap}>
          <div className={styles.sectionLabel}>CONNECTIONS</div>
        </div>
        <div className={styles.connRow}>
          <span className={styles.connLabel}>IN</span>
          <span className={styles.connValue} data-testid="connections-in-value">
            {incomingConnections.length > 0
              ? incomingConnections.map((connection, index) => (
                  <span className={styles.connTag} key={`in-${connection.label}-${index}`}>
                    <span className={styles.connDot} data-node-color={connection.color} data-testid={`connection-dot-in-${index}`} style={{ backgroundColor: connection.color }} />
                    {connection.label}
                  </span>
                ))
              : null}
          </span>
        </div>
        <div className={styles.connRow}>
          <span className={styles.connLabel}>OUT</span>
          <span className={styles.connValue} data-testid="connections-out-value">
            {outgoingConnections.length > 0
              ? outgoingConnections.map((connection, index) => (
                  <span className={styles.connTag} key={`out-${connection.label}-${index}`}>
                    <span className={styles.connDot} data-node-color={connection.color} data-testid={`connection-dot-out-${index}`} style={{ backgroundColor: connection.color }} />
                    {connection.label}
                  </span>
                ))
              : null}
          </span>
        </div>
      </section>
      <section className={`${styles.propsSection} ${styles.metaSection}`}>
        <div className={styles.sectionLabel}>META</div>
        <div className={styles.metaList}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>ID</span>
            <span className={styles.metaValue} data-testid="inspector-meta-id">{selectedNode?.id ?? '--'}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Type</span>
            <span className={styles.metaValue} data-testid="inspector-meta-type">{selectedNodeLabel}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Pos</span>
            <span className={styles.metaValue} data-testid="inspector-meta-position">{selectedNodePosition}</span>
          </div>
        </div>
      </section>
    </aside>
  )
}

function StatusBar({ connectionCount, lastError, nodeCount }: { connectionCount: number; lastError: string | null; nodeCount: number }) {
  return (
    <footer aria-label="Status Bar" className={styles.statusBar} data-region-id="gkrb8">
      <div className={styles.statusLeft}>
        <span>CPU: 4.2%</span>
        <span>Latency: 256 smp</span>
        <span>{lastError ?? 'Ready'}</span>
      </div>
      <div className={styles.statusRight}><span>{nodeCount} nodes | {connectionCount} connections</span><span className={styles.zoomBadge}><ZoomIn size={10} />100%</span></div>
    </footer>
  )
}

export function NodeEditorShell({ runtime = null }: { runtime?: AudioRuntime | null }) {
  const interaction = useGraphInteraction()
  const { pendingFromNodeId, state } = interaction
  const graphRuntimeBridge = useMemo(
    () =>
      createGraphRuntimeBridge((payload) => {
        emitGraphPayloadToRuntime(runtime, payload)
      }),
    [runtime],
  )
  const selectedNode = state.selectedNodeId
    ? state.nodes.find((node) => node.id === state.selectedNodeId) ?? null
    : null

  const selectedNodeLabel = useMemo(() => {
    if (!selectedNode) {
      return 'No node selected'
    }
    return getNodeLabel(selectedNode.kind)
  }, [selectedNode])

  const selectedNodeColor = useMemo(() => {
    if (!selectedNode) {
      return '#38BDF8'
    }
    return getNodeColor(selectedNode.kind)
  }, [selectedNode])

  const incomingConnections = useMemo(() => {
    if (!selectedNode) {
      return []
    }
    return state.edges
      .filter((edge) => edge.toNodeId === selectedNode.id)
      .map((edge) => state.nodes.find((node) => node.id === edge.fromNodeId))
      .filter((node): node is NonNullable<typeof node> => node !== undefined)
      .map((node) => ({
        color: getNodeColor(node.kind),
        label: getNodeLabel(node.kind),
      }))
  }, [selectedNode, state.edges, state.nodes])

  const outgoingConnections = useMemo(() => {
    if (!selectedNode) {
      return []
    }
    return state.edges
      .filter((edge) => edge.fromNodeId === selectedNode.id)
      .map((edge) => state.nodes.find((node) => node.id === edge.toNodeId))
      .filter((node): node is NonNullable<typeof node> => node !== undefined)
      .map((node) => ({
        color: getNodeColor(node.kind),
        label: getNodeLabel(node.kind),
      }))
  }, [selectedNode, state.edges, state.nodes])

  useEffect(() => {
    graphRuntimeBridge.sync(state)
  }, [graphRuntimeBridge, state])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }
      if (isEditableElement(event.target) || !selectedNode || selectedNode.kind === 'input' || selectedNode.kind === 'output') {
        return
      }
      interaction.removeNode(selectedNode.id)
      event.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [interaction, selectedNode])

  return (
    <div className={styles.shell} data-region-id="kvMK5">
      <TopBar />
      <section className={styles.contentArea} data-region-id="PdXfK">
        <NodePalette onAddNode={interaction.addNode} />
        <GraphCanvas
          onAddNodeAt={interaction.addNodeAt}
          onCompleteConnection={interaction.completeConnection}
          onDisconnect={interaction.disconnect}
          onMoveNode={interaction.moveNode}
          onRemoveNode={interaction.removeNode}
          onSelectNode={interaction.selectNode}
          onStartConnection={interaction.startConnection}
          pendingFromNodeId={pendingFromNodeId}
          state={state}
        />
        <InspectorPanel
          incomingConnections={incomingConnections}
          nodeColor={selectedNodeColor}
          onToggleBypass={interaction.toggleNodeBypass}
          onUpdateParam={interaction.updateNodeParam}
          outgoingConnections={outgoingConnections}
          selectedNode={selectedNode}
          selectedNodeLabel={selectedNodeLabel}
        />
      </section>
      <StatusBar connectionCount={state.edges.length} lastError={state.lastError} nodeCount={state.nodes.length} />
    </div>
  )
}
