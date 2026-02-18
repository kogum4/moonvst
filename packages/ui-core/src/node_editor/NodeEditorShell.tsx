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
import { EffectNode, EqNodeLarge, IONode, LibItem, ParamRow } from './NodePrimitives'
import styles from './NodeEditorShell.module.css'

type LibraryItem = { icon: LucideIcon; label: string; color: string }
type ParamItem = { label: string; valueText: string; value: number }

const ioItems: LibraryItem[] = [
  { icon: LogIn, label: 'Stereo Input', color: '#4ADE80' },
  { icon: LogOut, label: 'Stereo Output', color: '#FB923C' },
]

const fxItems: LibraryItem[] = [
  { icon: Waves, label: 'Chorus', color: '#818CF8' },
  { icon: Gauge, label: 'Compressor', color: '#F97316' },
  { icon: Timer, label: 'Delay', color: '#22D3EE' },
  { icon: Zap, label: 'Distortion', color: '#EF4444' },
  { icon: SlidersHorizontal, label: 'EQ', color: '#A3E635' },
  { icon: Filter, label: 'Filter', color: '#E879F9' },
  { icon: Airplay, label: 'Reverb (Dattorro)', color: '#38BDF8' },
]

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
        <button className={styles.ghostButton} type="button"><Plus className={styles.addNodeIcon} size={14} />Add Node</button>
        <button className={styles.ghostButton} type="button"><RotateCcw className={styles.resetIcon} size={14} />Reset</button>
        <div className={styles.vDivider} />
        <button className={styles.activeButton} type="button"><span className={styles.activeDot} />Active</button>
      </div>
    </header>
  )
}

function NodeLibraryPanel() {
  return (
    <nav aria-label="Node Library" className={styles.library} data-region-id="XQtg4">
      <div className={styles.libHeader}><Blocks size={14} />NODE LIBRARY</div>
      <div className={styles.sep} />
      <div className={styles.libSection}>I/O</div>
      {ioItems.map((item) => {
        const Icon = item.icon
        return <LibItem key={item.label} color={item.color} icon={<Icon size={14} />} label={item.label} />
      })}
      <div className={styles.sep} />
      <div className={styles.libSection}>EFFECTS</div>
      {fxItems.map((item) => {
        const Icon = item.icon
        return <LibItem key={item.label} color={item.color} icon={<Icon size={14} />} label={item.label} />
      })}
    </nav>
  )
}

function GraphCanvasRegion() {
  return (
    <main aria-label="Graph Canvas" className={styles.canvas} data-region-id="jJBPL">
      <div className={styles.canvasLabel}>DAG · Stereo · 8/16 nodes</div>
      <div className={styles.eqNode}><EqNodeLarge /></div>
      <div className={styles.ioNodeInput}><IONode icon={<LogIn size={12} />} variant="input" /></div>
      <div className={styles.ioNodeOutput}><IONode icon={<LogOut size={12} />} variant="output" /></div>
      <div className={styles.fxNodeMain}>
        <EffectNode
          color="#F97316"
          icon={<Gauge size={12} />}
          label="Compressor"
          rows={[
            { key: 'threshold', label: 'Threshold', value: '-18 dB' },
            { key: 'ratio', label: 'Ratio', value: '4:1' },
            { key: 'attack', label: 'Attack', value: '10 ms' },
          ]}
        />
      </div>
      <div className={styles.fxNodeGhostA}>
        <EffectNode
          color="#818CF8"
          icon={<Waves size={12} />}
          label="Chorus"
          rows={[
            { key: 'rate', label: 'Rate', value: '1.2 Hz' },
            { key: 'depth', label: 'Depth', value: '60%' },
            { key: 'mix', label: 'Mix', value: '40%' },
          ]}
        />
      </div>
      <div className={styles.fxNodeGhostB}>
        <EffectNode
          color="#22D3EE"
          icon={<Timer size={12} />}
          label="Delay"
          rows={[
            { key: 'time', label: 'Time', value: '375 ms' },
            { key: 'feedback', label: 'Feedback', value: '35%' },
            { key: 'mix', label: 'Mix', value: '25%' },
          ]}
        />
      </div>
      <div className={styles.fxNodeReverb}>
        <EffectNode
          color="#38BDF8"
          icon={<Airplay size={12} />}
          label="Reverb"
          rows={[
            { key: 'decay', label: 'Decay', value: '2.4 s' },
            { key: 'damping', label: 'Damping', value: '0.7' },
            { key: 'mix', label: 'Mix', value: '30%' },
          ]}
        />
      </div>
    </main>
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
          {params.map((row) => <ParamRow key={row.label} label={row.label} value={row.value} valueText={row.valueText} />)}
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
