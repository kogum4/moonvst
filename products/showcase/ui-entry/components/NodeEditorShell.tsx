import {
  Github,
  Moon,
  RotateCcw,
  Settings2,
  ZoomIn,
} from '../../../../packages/ui-core/src/vendor/lucide'
import '../../../../packages/ui-core/src/styles/showcaseFonts'
import { useMemo } from 'react'
import { GraphCanvas } from './GraphCanvas'
import { NodePalette } from './NodePalette'
import { ParamRow } from './NodePrimitives'
import { getNodeColor, getNodeLabel } from './graphUi'
import { useGraphInteraction } from './useGraphInteraction'
import styles from './NodeEditorShell.module.css'

type ParamItem = { label: string; valueText: string; value: number }

const params: ParamItem[] = [
  { label: 'Decay', valueText: '2.4 s', value: 56 },
  { label: 'Damping', valueText: '0.70', value: 64 },
  { label: 'Pre-Delay', valueText: '20 ms', value: 18 },
  { label: 'Size', valueText: '0.85', value: 78 },
  { label: 'Diffusion', valueText: '0.65', value: 59 },
  { label: 'Mix', valueText: '30%', value: 28 },
]

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
  outgoingConnections,
  selectedNodeLabel,
}: {
  incomingConnections: Array<{ color: string; label: string }>
  nodeColor: string
  outgoingConnections: Array<{ color: string; label: string }>
  selectedNodeLabel: string
}) {
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
        <div className={styles.sectionLabel}>PARAMETERS</div>
        <div className={styles.paramsList}>
          {params.map((row) => <ParamRow color={nodeColor} key={row.label} label={row.label} value={row.value} valueText={row.valueText} />)}
        </div>
      </section>
      <section className={styles.propsSection}>
        <div className={styles.sectionLabel}>CONNECTIONS</div>
        <div className={styles.connRow}>
          <span className={styles.connLabel}>IN</span>
          {incomingConnections.length > 0
            ? incomingConnections.map((connection, index) => (
                <span className={styles.connTag} key={`in-${connection.label}-${index}`}>
                  <span className={styles.connDot} data-node-color={connection.color} data-testid={`connection-dot-in-${index}`} style={{ backgroundColor: connection.color }} />
                  {connection.label}
                </span>
              ))
            : <span className={styles.monoSub}>none</span>}
        </div>
        <div className={styles.connRow}>
          <span className={styles.connLabel}>OUT</span>
          {outgoingConnections.length > 0
            ? outgoingConnections.map((connection, index) => (
                <span className={styles.connTag} key={`out-${connection.label}-${index}`}>
                  <span className={styles.connDot} data-node-color={connection.color} data-testid={`connection-dot-out-${index}`} style={{ backgroundColor: connection.color }} />
                  {connection.label}
                </span>
              ))
            : <span className={styles.monoSub}>none</span>}
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
          onSelectNode={interaction.selectNode}
          onStartConnection={interaction.startConnection}
          pendingFromNodeId={pendingFromNodeId}
          state={state}
        />
        <InspectorPanel
          incomingConnections={incomingConnections}
          nodeColor={selectedNodeColor}
          outgoingConnections={outgoingConnections}
          selectedNodeLabel={selectedNodeLabel}
        />
      </section>
      <StatusBar connectionCount={state.edges.length} lastError={state.lastError} nodeCount={state.nodes.length} />
    </div>
  )
}
