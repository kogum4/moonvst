import {
  Airplay,
  Filter,
  Gauge,
  SlidersHorizontal,
  Timer,
  Waves,
  Zap,
} from '../vendor/lucide'
import type { LucideIcon } from '../vendor/lucide'
import type { NodeKind } from '../state/graphTypes'

export type EffectKind = Exclude<NodeKind, 'input' | 'output'>

type EffectVisual = {
  color: string
  icon: LucideIcon
  label: string
  rows: Array<{ key: string; label: string; value: string }>
}

export const EFFECT_LIBRARY: Array<{ kind: EffectKind; label: string; color: string; icon: LucideIcon }> = [
  { kind: 'chorus', label: 'Chorus', color: '#818CF8', icon: Waves },
  { kind: 'compressor', label: 'Compressor', color: '#F97316', icon: Gauge },
  { kind: 'delay', label: 'Delay', color: '#22D3EE', icon: Timer },
  { kind: 'distortion', label: 'Distortion', color: '#EF4444', icon: Zap },
  { kind: 'eq', label: 'EQ', color: '#A3E635', icon: SlidersHorizontal },
  { kind: 'filter', label: 'Filter', color: '#E879F9', icon: Filter },
  { kind: 'reverb', label: 'Reverb', color: '#38BDF8', icon: Airplay },
]

const EFFECT_VISUALS: Record<EffectKind, EffectVisual> = {
  chorus: {
    color: '#818CF8',
    icon: Waves,
    label: 'Chorus',
    rows: [
      { key: 'rate', label: 'Rate', value: '1.2 Hz' },
      { key: 'depth', label: 'Depth', value: '60%' },
      { key: 'mix', label: 'Mix', value: '40%' },
    ],
  },
  compressor: {
    color: '#F97316',
    icon: Gauge,
    label: 'Compressor',
    rows: [
      { key: 'threshold', label: 'Threshold', value: '-24 dB' },
      { key: 'ratio', label: 'Ratio', value: '12:1' },
      { key: 'wet', label: 'Wet', value: '100%' },
    ],
  },
  delay: {
    color: '#22D3EE',
    icon: Timer,
    label: 'Delay',
    rows: [
      { key: 'timeMs', label: 'Time', value: '375 ms' },
      { key: 'feedback', label: 'Feedback', value: '0%' },
      { key: 'filterHz', label: 'Filter', value: '2400 Hz' },
      { key: 'wetDry', label: 'Wet/Dry', value: '100%' },
    ],
  },
  distortion: {
    color: '#EF4444',
    icon: Zap,
    label: 'Distortion',
    rows: [
      { key: 'drive', label: 'Drive', value: '60%' },
      { key: 'warmth', label: 'Warmth', value: '50%' },
      { key: 'aura', label: 'Aura', value: '50%' },
      { key: 'output', label: 'Output', value: '100%' },
      { key: 'mix', label: 'Dry/Wet', value: '100%' },
    ],
  },
  eq: {
    color: '#A3E635',
    icon: SlidersHorizontal,
    label: 'EQ',
    rows: [
      { key: 'low', label: 'Low', value: '+1.8 dB' },
      { key: 'mid', label: 'Mid', value: '-0.6 dB' },
      { key: 'high', label: 'High', value: '+2.1 dB' },
    ],
  },
  filter: {
    color: '#E879F9',
    icon: Filter,
    label: 'Filter',
    rows: [
      { key: 'cutoff', label: 'Cutoff', value: '2500 Hz' },
      { key: 'q', label: 'Q', value: '0.71' },
      { key: 'mix', label: 'Mix', value: '100%' },
    ],
  },
  reverb: {
    color: '#38BDF8',
    icon: Airplay,
    label: 'Reverb',
    rows: [
      { key: 'decay', label: 'Decay', value: '2.4 s' },
      { key: 'damping', label: 'Damping', value: '0.7' },
      { key: 'mix', label: 'Mix', value: '30%' },
    ],
  },
}

export const IO_NODE_VISUALS = {
  input: { label: 'Input', color: '#4ADE80' },
  output: { label: 'Output', color: '#FB923C' },
} as const

export function getNodeLabel(kind: NodeKind): string {
  if (kind === 'input') {
    return IO_NODE_VISUALS.input.label
  }
  if (kind === 'output') {
    return IO_NODE_VISUALS.output.label
  }
  return EFFECT_VISUALS[kind].label
}

export function getNodeColor(kind: NodeKind): string {
  if (kind === 'input') {
    return IO_NODE_VISUALS.input.color
  }
  if (kind === 'output') {
    return IO_NODE_VISUALS.output.color
  }
  return EFFECT_VISUALS[kind].color
}

export function getEffectVisual(kind: EffectKind): EffectVisual {
  return EFFECT_VISUALS[kind]
}
