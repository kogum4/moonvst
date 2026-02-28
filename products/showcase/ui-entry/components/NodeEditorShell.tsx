import {
  Check,
  ChevronDown,
  ChevronUp,
  Github,
  Import,
  Moon,
  Music,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Type,
  Undo2,
  X,
  Zap,
  ZoomIn,
} from '../vendor/lucide'
import '../styles/showcaseFonts'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
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
import {
  deserializeShowcaseUiState,
  graphStateFromPreset,
  loadGraphStateFromStorage,
  loadPresetsFromStorage,
  saveGraphStateToStorage,
  savePresetsToStorage,
  upsertPreset,
  type ShowcasePresetRecord,
} from '../runtime/graphUiState'
import styles from './NodeEditorShell.module.css'

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
}

const hasJuceBridge = () => {
  if (typeof window === 'undefined') {
    return false
  }
  return (window as Window & { __JUCE__?: unknown }).__JUCE__ !== undefined
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

interface PresetMenuItem {
  name: string
  available: boolean
}

function TopBar({
  canRedo,
  canUndo,
  isPresetMenuOpen,
  onRedo,
  onReset,
  onTogglePresetMenu,
  onOpenSaveDialog,
  onUndo,
  presetName,
  presetToggleRef,
}: {
  canRedo: boolean
  canUndo: boolean
  isPresetMenuOpen: boolean
  onRedo: () => void
  onReset: () => void
  onTogglePresetMenu: () => void
  onOpenSaveDialog: () => void
  onUndo: () => void
  presetName: string
  presetToggleRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <header aria-label="Top Bar" className={styles.topBar} data-region-id="FMWVd">
      <div className={styles.topLeft}>
        <div className={styles.logoWrap}>
          <Moon className={styles.logoIcon} size={20} strokeWidth={2} />
          <span className={styles.logoText}>MoonVST</span>
        </div>
        <div className={styles.vDivider} />
        <div className={styles.presetGroupWrap} ref={presetToggleRef}>
          <div className={styles.presetGroup}>
            <button
              aria-expanded={isPresetMenuOpen}
              aria-haspopup="menu"
              aria-label="Open Preset Dropdown"
              className={`${styles.presetSelector} ${isPresetMenuOpen ? styles.presetSelectorOpen : ''}`}
              onClick={onTogglePresetMenu}
              type="button"
            >
              <span className={styles.presetName}>{presetName}</span>
              {isPresetMenuOpen ? <ChevronUp className={styles.presetChevronOpen} size={12} /> : <ChevronDown className={styles.presetChevron} size={12} />}
            </button>
            <button aria-label="Open Save Preset Dialog" className={styles.iconButton} onClick={onOpenSaveDialog} type="button">
              <Save size={14} />
            </button>
          </div>
        </div>
        <div className={styles.vDivider} />
        <div className={styles.undoRedoGroup}>
          <button aria-label="Undo" className={styles.iconGhostButton} disabled={!canUndo} onClick={onUndo} type="button"><Undo2 size={14} /></button>
          <button aria-label="Redo" className={styles.iconGhostButton} disabled={!canRedo} onClick={onRedo} type="button"><Redo2 size={14} /></button>
        </div>
      </div>
      <div className={styles.topRight}>
        <a aria-label="Open GitHub Repository" className={styles.iconButton} href="https://github.com/kogum4/moonvst" rel="noreferrer" target="_blank"><Github size={14} /></a>
        <button aria-label="Reset" className={styles.resetButton} onClick={onReset} type="button"><RotateCcw className={styles.resetIcon} size={14} />Reset</button>
        <div className={styles.vDivider} />
        <button aria-label="Active" className={styles.activeButton} type="button"><span className={styles.activeDot} />Active</button>
      </div>
    </header>
  )
}

function PresetDropdown({
  factoryPresets,
  onClosePresetMenu,
  onCreatePreset,
  onImportPreset,
  onRequestDeletePreset,
  onSelectPreset,
  presetName,
  presetDropdownRef,
  userPresets,
}: {
  factoryPresets: PresetMenuItem[]
  onClosePresetMenu: () => void
  onCreatePreset: () => void
  onImportPreset: () => void
  onRequestDeletePreset: (name: string) => void
  onSelectPreset: (name: string) => void
  presetName: string
  presetDropdownRef: RefObject<HTMLDivElement | null>
  userPresets: PresetMenuItem[]
}) {
  return (
    <div className={styles.presetDropdownLayer} ref={presetDropdownRef}>
      <div aria-label="Preset Dropdown Menu" className={styles.presetDropdown} role="menu">
        <div className={styles.presetDropdownLabel}>FACTORY</div>
        {factoryPresets.map((preset) => {
          const isSelected = preset.name === presetName
          return (
            <button
              aria-label={`Load preset ${preset.name}`}
              className={`${styles.presetDropdownItem} ${isSelected ? styles.presetDropdownItemActive : ''}`}
              disabled={!preset.available}
              key={`factory-${preset.name}`}
              onClick={() => {
                onSelectPreset(preset.name)
                onClosePresetMenu()
              }}
              role="menuitem"
              type="button"
            >
              {isSelected ? <Check className={styles.presetDropdownIconActive} size={14} /> : null}
              <span className={isSelected ? styles.presetDropdownTextActive : ''}>{preset.name}</span>
            </button>
          )
        })}
        <div className={styles.presetDropdownSeparator} />
        <div className={styles.presetDropdownLabel}>USER</div>
        {userPresets.map((preset) => (
          <div className={styles.presetDropdownUserRow} key={`user-${preset.name}`}>
            <button
              aria-label={`Load preset ${preset.name}`}
              className={`${styles.presetDropdownItem} ${styles.presetDropdownUserItem}`}
              disabled={!preset.available}
              onClick={() => {
                onSelectPreset(preset.name)
                onClosePresetMenu()
              }}
              role="menuitem"
              type="button"
            >
              <span>{preset.name}</span>
            </button>
            {preset.available ? (
              <button
                aria-label={`Delete preset ${preset.name}`}
                className={styles.presetDropdownDeleteIconButton}
                onClick={() => {
                  onRequestDeletePreset(preset.name)
                  onClosePresetMenu()
                }}
                type="button"
              >
                <Trash2 className={styles.presetDropdownDeleteIcon} size={13} />
              </button>
            ) : null}
          </div>
        ))}
        <div className={styles.presetDropdownSeparator} />
        <button
          aria-label="Create New Preset"
          className={styles.presetDropdownAction}
          onClick={() => {
            onCreatePreset()
            onClosePresetMenu()
          }}
          role="menuitem"
          type="button"
        >
          <span className={styles.presetDropdownActionIcon}><Plus size={14} /></span>
          <span>New Preset…</span>
        </button>
        <button
          aria-label="Import Preset"
          className={styles.presetDropdownAction}
          onClick={() => {
            onImportPreset()
            onClosePresetMenu()
          }}
          role="menuitem"
          type="button"
        >
          <span className={styles.presetDropdownActionIcon}><Import size={14} /></span>
          <span>Import Preset…</span>
        </button>
      </div>
    </div>
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
    <aside
      aria-label="Properties Panel"
      className={styles.inspector}
      data-region-id="P0JNl"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
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

function LoadingScreen() {
  return (
    <div aria-label="Loading Screen" className={styles.loadingShell} data-region-id="syYFs" role="status">
      <div className={styles.loadingLogoGroup}>
        <div className={styles.loadingLogoRow}>
          <Moon className={styles.loadingLogoIcon} size={40} strokeWidth={2} />
          <span className={styles.loadingLogoText}>MoonVST</span>
        </div>
        <span className={styles.loadingVersionText}>v1.0.0</span>
      </div>
      <div className={styles.loadingArea}>
        <div className={styles.loadingBarBackground}>
          <div className={styles.loadingBarFill} />
        </div>
        <span className={styles.loadingText}>Loading...</span>
      </div>
    </div>
  )
}

export function NodeEditorShell({ runtime = null }: { runtime?: AudioRuntime | null }) {
  const interaction = useGraphInteraction()
  const { pendingFromNodeId, state } = interaction
  const [presetName, setPresetName] = useState('Default Preset')
  const [presets, setPresets] = useState<ShowcasePresetRecord[]>([])
  const [isPresetMenuOpen, setPresetMenuOpen] = useState(false)
  const [isSaveDialogOpen, setSaveDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePresetName, setDeletePresetName] = useState<string | null>(null)
  const [overwriteCandidateName, setOverwriteCandidateName] = useState<string | null>(null)
  const [saveDraftName, setSaveDraftName] = useState('')
  const presetToggleRef = useRef<HTMLDivElement | null>(null)
  const presetDropdownRef = useRef<HTMLDivElement | null>(null)
  const hydratedRef = useRef(false)
  const [isHydrationPending, setHydrationPending] = useState(() => runtime?.type === 'juce' || hasJuceBridge())
  const graphRuntimeBridge = useMemo(
    () =>
      createGraphRuntimeBridge((payload, revision) => {
        emitGraphPayloadToRuntime(runtime, payload, revision)
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
    if (!hydratedRef.current) {
      return
    }
    graphRuntimeBridge.sync(state)
  }, [graphRuntimeBridge, state])

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const storage = window.localStorage
      const shouldRestoreFromHost = runtime?.type === 'juce' || hasJuceBridge()
      let initial: ReturnType<typeof loadGraphStateFromStorage> = null
      setHydrationPending(shouldRestoreFromHost)

      if (shouldRestoreFromHost) {
        // In JUCE hosts, wait for runtime bridge and restore only from the host-owned instance state.
        if (runtime?.type !== 'juce' || !runtime.invokeNative) {
          return
        }

        try {
          const raw = await runtime.invokeNative('getUiState')
          if (typeof raw === 'string' && raw.trim() !== '') {
            const parsed = JSON.parse(raw) as unknown
            const restored = deserializeShowcaseUiState(parsed)
            if (restored) {
              initial = restored
            }
          }
        } catch {
          // Ignore invalid host payload and keep default state.
        }
      } else {
        initial = loadGraphStateFromStorage(storage)
      }

      if (cancelled) {
        return
      }

      const initialPresets = loadPresetsFromStorage(storage)
      setPresets(initialPresets)

      if (initial) {
        interaction.replaceState(initial.graphState, false)
        setPresetName(initial.lastPresetName)
      }
      hydratedRef.current = true
      setHydrationPending(false)
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtime])

  useEffect(() => {
    if (!hydratedRef.current) {
      return
    }
    saveGraphStateToStorage(window.localStorage, state, presetName)
    if (runtime?.type === 'juce' && runtime.invokeNative) {
      const payload = JSON.stringify({
        version: 1,
        graphPayload: graphRuntimeBridge.sync(state),
        lastPresetName: presetName,
      })
      void runtime.invokeNative('setUiState', payload)
    }
  }, [graphRuntimeBridge, presetName, runtime, state])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.ctrlKey || event.metaKey
      if (isMeta && event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
          interaction.redo()
        } else {
          interaction.undo()
        }
        event.preventDefault()
        return
      }
      if (isMeta && event.key.toLowerCase() === 'y') {
        interaction.redo()
        event.preventDefault()
        return
      }
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

  const closeSaveDialog = () => {
    setSaveDialogOpen(false)
  }

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setDeletePresetName(null)
  }

  const openSaveDialog = () => {
    setSaveDraftName(presetName)
    setOverwriteCandidateName(null)
    setSaveDialogOpen(true)
  }

  const savePresetWithName = (name: string) => {
    const updated = upsertPreset(presets, name, state)
    setPresets(updated)
    savePresetsToStorage(window.localStorage, updated)
    setPresetName(name)
    setOverwriteCandidateName(null)
    closeSaveDialog()
  }

  const handleSavePreset = () => {
    const trimmedName = saveDraftName.trim()
    if (!trimmedName) {
      return
    }

    const existingPreset = presets.find((preset) => preset.name === trimmedName)
    if (existingPreset && overwriteCandidateName !== trimmedName) {
      setOverwriteCandidateName(trimmedName)
      return
    }

    savePresetWithName(trimmedName)
  }

  const handleLoadPreset = (name: string) => {
    if (name === 'Default Preset') {
      interaction.reset()
      setPresetName('Default Preset')
      return
    }
    const preset = presets.find((entry) => entry.name === name.trim())
    if (!preset) {
      return
    }
    interaction.replaceState(graphStateFromPreset(preset), true)
    setPresetName(preset.name)
  }

  const handleOpenDeleteDialog = (name: string) => {
    setDeletePresetName(name)
    setDeleteDialogOpen(true)
  }

  const handleDeletePreset = () => {
    if (!deletePresetName) {
      return
    }
    const updated = presets.filter((preset) => preset.name !== deletePresetName)
    setPresets(updated)
    savePresetsToStorage(window.localStorage, updated)
    if (presetName === deletePresetName) {
      interaction.reset()
      setPresetName('Default Preset')
    }
    closeDeleteDialog()
  }

  const handleReset = () => {
    interaction.reset()
    setPresetName('Default Preset')
  }

  useEffect(() => {
    if (!isPresetMenuOpen) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return
      }
      if (presetToggleRef.current?.contains(event.target) || presetDropdownRef.current?.contains(event.target)) {
        return
      }
      setPresetMenuOpen(false)
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresetMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isPresetMenuOpen])

  useEffect(() => {
    if (!isSaveDialogOpen) {
      return
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSaveDialog()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isSaveDialogOpen])

  useEffect(() => {
    if (!isDeleteDialogOpen) {
      return
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDeleteDialog()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isDeleteDialogOpen])

  const factoryPresets = useMemo<PresetMenuItem[]>(
    () => [
      { name: 'Default Preset', available: true },
      { name: 'Warm Analog', available: false },
      { name: 'Dark Shimmer', available: false },
      { name: 'Crystal Clean', available: false },
    ],
    [],
  )

  const userPresets = useMemo<PresetMenuItem[]>(
    () =>
      presets.length > 0
        ? presets.map((preset) => ({ name: preset.name, available: true }))
        : [
            { name: 'My Custom Lead', available: false },
            { name: 'Lo-Fi Tape', available: false },
          ],
    [presets],
  )

  const isOverwriteWarningVisible =
    overwriteCandidateName !== null &&
    saveDraftName.trim() === overwriteCandidateName

  if (isHydrationPending) {
    return <LoadingScreen />
  }

  return (
    <div className={styles.shell} data-region-id="kvMK5">
      <TopBar
        canRedo={interaction.canRedo}
        canUndo={interaction.canUndo}
        isPresetMenuOpen={isPresetMenuOpen}
        onRedo={interaction.redo}
        onReset={handleReset}
        onTogglePresetMenu={() => setPresetMenuOpen((current) => !current)}
        onOpenSaveDialog={openSaveDialog}
        onUndo={interaction.undo}
        presetName={presetName}
        presetToggleRef={presetToggleRef}
      />
      <section className={styles.contentArea} data-region-id="PdXfK">
        {isPresetMenuOpen ? (
          <PresetDropdown
            factoryPresets={factoryPresets}
            onClosePresetMenu={() => setPresetMenuOpen(false)}
            onCreatePreset={openSaveDialog}
            onImportPreset={() => {}}
            onRequestDeletePreset={handleOpenDeleteDialog}
            onSelectPreset={handleLoadPreset}
            presetDropdownRef={presetDropdownRef}
            presetName={presetName}
            userPresets={userPresets}
          />
        ) : null}
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
        {isSaveDialogOpen ? (
          <div className={styles.modalOverlay}>
            <div aria-label="Save Preset Dialog" className={styles.saveDialog} role="dialog">
              <div className={styles.saveDialogHeader}>
                <div className={styles.saveDialogHeaderLeft}>
                  <span className={styles.saveDialogHeaderIcon}><Save size={18} /></span>
                  <span className={styles.saveDialogHeaderText}>
                    <span className={styles.saveDialogTitle}>Save Preset</span>
                    <span className={styles.saveDialogSubtitle}>Store your current configuration</span>
                  </span>
                </div>
                <button aria-label="Close Save Preset Dialog" className={styles.saveDialogClose} onClick={closeSaveDialog} type="button"><X size={14} /></button>
              </div>
              <div className={styles.saveDialogSeparator} />
              <div className={styles.saveDialogBody}>
                <label className={styles.saveDialogFieldLabel} htmlFor="preset-name-input">PRESET NAME</label>
                <div className={styles.saveDialogInputWrap}>
                  <Type className={styles.saveDialogInputIcon} size={14} />
                  <input
                    aria-label="Preset Name"
                    className={styles.saveDialogInput}
                    id="preset-name-input"
                    onChange={(event) => {
                      setSaveDraftName(event.target.value)
                      setOverwriteCandidateName(null)
                    }}
                    value={saveDraftName}
                  />
                </div>
                {isOverwriteWarningVisible ? (
                  <div className={styles.saveDialogWarning}>
                    <Zap className={styles.saveDialogWarningIcon} size={12} />
                    <span>This preset name already exists. Click Overwrite to replace it.</span>
                  </div>
                ) : (
                  <div className={styles.saveDialogHint}>Enter a unique name for your preset</div>
                )}
              </div>
              <div className={styles.saveDialogSeparator} />
              <div className={styles.saveDialogFooter}>
                <button aria-label="Cancel Save Preset" className={styles.saveDialogCancel} onClick={closeSaveDialog} type="button">Cancel</button>
                <button
                  aria-label={isOverwriteWarningVisible ? 'Confirm Overwrite Preset' : 'Confirm Save Preset'}
                  className={`${styles.saveDialogConfirm} ${isOverwriteWarningVisible ? styles.saveDialogConfirmOverwrite : ''}`}
                  onClick={handleSavePreset}
                  type="button"
                >
                  <Save size={14} />
                  <span>{isOverwriteWarningVisible ? 'Overwrite' : 'Save Preset'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {isDeleteDialogOpen ? (
          <div className={styles.modalOverlay}>
            <div aria-label="Delete Preset Dialog" className={styles.deleteDialog} role="dialog">
              <div className={styles.deleteDialogHeader}>
                <div className={styles.deleteDialogHeaderLeft}>
                  <span className={styles.deleteDialogHeaderIcon}><Trash2 size={18} /></span>
                  <span className={styles.deleteDialogHeaderText}>
                    <span className={styles.deleteDialogTitle}>Delete Preset</span>
                    <span className={styles.deleteDialogSubtitle}>This action cannot be undone</span>
                  </span>
                </div>
                <button aria-label="Close Delete Preset Dialog" className={styles.deleteDialogClose} onClick={closeDeleteDialog} type="button"><X size={14} /></button>
              </div>
              <div className={styles.deleteDialogSeparator} />
              <div className={styles.deleteDialogBody}>
                <div className={styles.deleteDialogMessage}>
                  Are you sure you want to delete this preset? This action is permanent and cannot be reversed.
                </div>
                <div className={styles.deleteDialogPresetInfo}>
                  <Music className={styles.deleteDialogPresetInfoIcon} size={16} />
                  <span className={styles.deleteDialogPresetInfoText}>{deletePresetName ?? ''}</span>
                </div>
              </div>
              <div className={styles.deleteDialogSeparator} />
              <div className={styles.deleteDialogFooter}>
                <button aria-label="Cancel Delete Preset" className={styles.deleteDialogCancel} onClick={closeDeleteDialog} type="button">Cancel</button>
                <button aria-label="Confirm Delete Preset" className={styles.deleteDialogConfirm} onClick={handleDeletePreset} type="button">
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <StatusBar connectionCount={state.edges.length} lastError={state.lastError} nodeCount={state.nodes.length} />
    </div>
  )
}


