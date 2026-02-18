import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import {
  Airplay,
  ArrowLeft,
  ArrowRight,
  Blocks,
  Filter,
  Gauge,
  LogIn,
  LogOut,
  Moon,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Timer,
  Waves,
  Zap,
  ZoomIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import styles from './NodeEditorShell.module.css'

type LibItem = { icon: LucideIcon; label: string; color: string }
type ParamRow = { label: string; value: string; progress: number }

const ioItems: LibItem[] = [
  { icon: LogIn, label: 'Stereo Input', color: '#4ADE80' },
  { icon: LogOut, label: 'Stereo Output', color: '#FB923C' },
]

const fxItems: LibItem[] = [
  { icon: Waves, label: 'Chorus', color: '#818CF8' },
  { icon: Gauge, label: 'Compressor', color: '#F97316' },
  { icon: Timer, label: 'Delay', color: '#22D3EE' },
  { icon: Zap, label: 'Distortion', color: '#EF4444' },
  { icon: SlidersHorizontal, label: 'EQ', color: '#A3E635' },
  { icon: Filter, label: 'Filter', color: '#E879F9' },
  { icon: Airplay, label: 'Reverb (Dattorro)', color: '#38BDF8' },
]

const params: ParamRow[] = [
  { label: 'Decay', value: '2.4 s', progress: 56 },
  { label: 'Damping', value: '0.70', progress: 64 },
  { label: 'Pre-Delay', value: '20 ms', progress: 18 },
  { label: 'Size', value: '0.85', progress: 78 },
  { label: 'Diffusion', value: '0.65', progress: 59 },
  { label: 'Mix', value: '30%', progress: 28 },
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
        <button className={styles.ghostButton} type="button"><Plus className={styles.addNodeIcon} size={14} />Add Node</button>
        <button className={styles.ghostButton} type="button"><RotateCcw className={styles.resetIcon} size={14} />Reset</button>
        <div className={styles.vDivider} />
        <button className={styles.activeButton} type="button"><span className={styles.activeDot} />Active</button>
      </div>
    </header>
  )
}

function LibraryItem({ item }: { item: LibItem }) {
  const Icon = item.icon
  return (
    <button className={styles.libItem} type="button">
      <span className={styles.libItemDot} style={{ backgroundColor: item.color }} />
      <Icon className={styles.libItemIcon} size={14} />
      <span className={styles.libItemText}>{item.label}</span>
    </button>
  )
}

function NodeLibraryPanel() {
  return (
    <nav aria-label="Node Library" className={styles.library} data-region-id="XQtg4">
      <div className={styles.libHeader}><Blocks size={14} />NODE LIBRARY</div>
      <div className={styles.sep} />
      <div className={styles.libSection}>I/O</div>
      {ioItems.map((item) => <LibraryItem key={item.label} item={item} />)}
      <div className={styles.sep} />
      <div className={styles.libSection}>EFFECTS</div>
      {fxItems.map((item) => <LibraryItem key={item.label} item={item} />)}
    </nav>
  )
}

function GraphCanvasRegion() {
  return (
    <main aria-label="Graph Canvas" className={styles.canvas} data-region-id="jJBPL">
      <div className={styles.canvasLabel}>DAG · Stereo · 8/16 nodes</div>
      <div className={styles.eqCard}><div className={styles.eqHeader}>EQ</div><div className={styles.eqBody} /></div>
      <div className={styles.ioNodeInput}>INPUT</div>
      <div className={styles.ioNodeOutput}>OUTPUT</div>
      <div className={styles.fxNodeMain}>COMPRESSOR</div>
      <div className={styles.fxNodeGhostA}>CHORUS</div>
      <div className={styles.fxNodeGhostB}>DELAY</div>
      <div className={styles.fxNodeReverb}>REVERB</div>
    </main>
  )
}

function ParamSliderRow({ row }: { row: ParamRow }) {
  return (
    <div className={styles.paramRow}>
      <div className={styles.paramTop}>
        <span className={styles.paramLabel}>{row.label}</span>
        <span className={styles.paramValue}>{row.value}</span>
      </div>
      <div className={styles.paramTrack}><span className={styles.paramFill} style={{ width: `${row.progress}%` }} /><span className={styles.paramThumb} style={{ left: `calc(${row.progress}% - 5px)` }} /></div>
    </div>
  )
}

function Tag({ color, text }: { color: string; text: string }) {
  return <span className={styles.connTag}><span className={styles.connDot} style={{ backgroundColor: color }} />{text}</span>
}

function InspectorPanel() {
  return (
    <aside aria-label="Properties Panel" className={styles.inspector} data-region-id="P0JNl">
      <div className={styles.propsHeader}><Settings2 size={14} />PROPERTIES</div>
      <section className={styles.propsSection}>
        <div className={styles.nodeInfo}>
          <span className={styles.nodeDot} />
          <span className={styles.nodeTitleText}>Reverb (Dattorro)</span>
        </div>
        <div className={styles.monoSub}>Stereo effect · Algorithmic reverb</div>
      </section>
      <section className={styles.propsSection}>
        <div className={styles.sectionLabel}>PARAMETERS</div>
        <div className={styles.paramsList}>
          {params.map((row) => <ParamSliderRow key={row.label} row={row} />)}
        </div>
      </section>
      <section className={styles.propsSection}>
        <div className={styles.sectionLabel}>CONNECTIONS</div>
        <div className={styles.connRow}><ArrowRight size={12} /><span className={styles.connLabel}>IN</span><Tag color="#818CF8" text="Chorus" /><Tag color="#22D3EE" text="Delay" /></div>
        <div className={styles.connRow}><ArrowLeft size={12} /><span className={styles.connLabel}>OUT</span><Tag color="#FB923C" text="Output" /></div>
      </section>
    </aside>
  )
}

function StatusBar() {
  return (
    <footer aria-label="Status Bar" className={styles.statusBar} data-region-id="gkrb8">
      <div className={styles.statusLeft}><span>CPU: 4.2%</span><span>Latency: 256 smp</span><span>48kHz / 32-bit</span></div>
      <div className={styles.statusRight}><span>8 nodes · 7 connections</span><span className={styles.zoomBadge}><ZoomIn size={10} />100%</span></div>
    </footer>
  )
}

export function NodeEditorShell() {
  return (
    <div className={styles.shell} data-region-id="kvMK5">
      <TopBar />
      <section className={styles.contentArea} data-region-id="PdXfK">
        <NodeLibraryPanel />
        <GraphCanvasRegion />
        <InspectorPanel />
      </section>
      <StatusBar />
    </div>
  )
}
