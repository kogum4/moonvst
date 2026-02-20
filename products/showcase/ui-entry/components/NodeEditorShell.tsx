import {
  Github,
  Moon,
  RotateCcw,
  Settings2,
  ZoomIn,
} from '../../../../packages/ui-core/src/vendor/lucide'
import '../../../../packages/ui-core/src/styles/showcaseFonts'
import { useEffect, useMemo } from 'react'
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
import styles from './NodeEditorShell.module.css'

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
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

  return (
    <aside aria-label="Properties Panel" className={styles.inspector} data-region-id="P0JNl">
      <div className={styles.propsHeader}><Settings2 size={14} />PROPERTIES</div>
      <section className={styles.propsSection}>
        <div className={styles.nodeInfo}>
          <span
            className={styles.nodeDot}
            data-node-color={nodeColor}
            data-testid="inspector-node-dot"
            style={{ backgroundColor: nodeColor }}
          />
          <span className={styles.nodeTitleText}>{selectedNodeLabel}</span>
        </div>
        <div className={styles.monoSub}>Stereo effect | Showcase editor</div>
      </section>
      <section className={styles.propsSection}>
        <div className={styles.sectionLabel}>METADATA</div>
        <div className={styles.metaGrid}>
          <span className={styles.metaLabel}>Node ID</span>
          <span className={styles.metaValue} data-testid="inspector-meta-id">{selectedNode?.id ?? '--'}</span>
          <span className={styles.metaLabel}>Type</span>
          <span className={styles.metaValue} data-testid="inspector-meta-type">{selectedNodeLabel}</span>
          <span className={styles.metaLabel}>Position</span>
          <span className={styles.metaValue} data-testid="inspector-meta-position">{selectedNodePosition}</span>
        </div>
      </section>
      <section className={styles.propsSection}>
        <div className={styles.sectionLabel}>STATE</div>
        <div className={styles.toggleRow}>
          <button
            aria-label={`Bypass ${selectedNodeLabel}`}
            aria-pressed={selectedNode?.bypass ? 'true' : 'false'}
            className={styles.bypassButton}
            disabled={!canEditParams || !selectedNode}
            onClick={() => {
              if (!selectedNode || !canEditParams) {
                return
              }
              onToggleBypass(selectedNode.id)
            }}
            type="button"
          >
            Bypass
          </button>
          <span className={styles.metaValue}>{selectedNode?.bypass ? 'ON' : 'OFF'}</span>
        </div>
      </section>
      <section className={styles.propsSection}>
        <div className={styles.sectionLabel}>PARAMETERS</div>
        {canEditParams && selectedNode ? (
          <div className={styles.paramsList}>
            {paramSpecs.map((spec) => {
              const value = getNodeParamValue(selectedNode, spec.key) ?? spec.defaultValue
              const valueText = formatNodeParamValue(selectedNode, spec.key)
              return (
                <label className={styles.paramControl} key={spec.key}>
                  <div className={styles.paramControlHead}>
                    <span>{spec.label}</span>
                    <span data-param-color={nodeColor} style={{ color: nodeColor }}>{valueText}</span>
                  </div>
                  <input
                    aria-label={spec.label}
                    max={spec.max}
                    min={spec.min}
                    onChange={(event) => onUpdateParam(selectedNode.id, spec.key, Number(event.target.value))}
                    step={spec.step ?? 1}
                    type="range"
                    value={value}
                  />
                </label>
              )
            })}
          </div>
        ) : (
          <div className={styles.monoSub}>No editable parameters for current selection.</div>
        )}
      </section>
      <section className={`${styles.propsSection} ${styles.connectionsSection}`}>
        <div className={styles.sectionLabel}>CONNECTIONS</div>
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

export function NodeEditorShell() {
  const interaction = useGraphInteraction()
  const { pendingFromNodeId, state } = interaction
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
