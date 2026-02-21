import type { GraphNode, NodeKind } from './graphTypes'

export type EffectNodeKind = Exclude<NodeKind, 'input' | 'output'>

export type NodeParamSpec = {
  key: string
  label: string
  min: number
  max: number
  step?: number
  defaultValue: number
  formatValue: (value: number) => string
  scale?: 'linear' | 'log'
}

const formatPercent = (value: number) => `${Math.round(value)}%`
const formatMs = (value: number) => `${Math.round(value)} ms`
const formatDb = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`
const formatRatio = (value: number) => `${value.toFixed(1)}:1`
const formatUnitless = (value: number) => value.toFixed(2)
const formatRateHz = (value: number) => `${value.toFixed(value < 1 ? 2 : 1)} Hz`
const formatHz = (value: number) => `${Math.round(value)} Hz`
const FILTER_MODE_LABELS = ['LP', 'HP', 'BP', 'Notch', 'Peak', 'All-pass'] as const
const formatFilterMode = (value: number) => {
  const idx = Math.max(0, Math.min(FILTER_MODE_LABELS.length - 1, Math.round(value)))
  return FILTER_MODE_LABELS[idx]
}

const EFFECT_NODE_PARAM_SPECS: Record<EffectNodeKind, NodeParamSpec[]> = {
  chorus: [
    { key: 'rate', label: 'Rate', min: 0.05, max: 5.0, step: 0.01, defaultValue: 1.2, formatValue: formatRateHz },
    { key: 'depth', label: 'Depth', min: 0, max: 100, step: 1, defaultValue: 55, formatValue: formatPercent },
    { key: 'mix', label: 'Mix', min: 0, max: 100, step: 1, defaultValue: 35, formatValue: formatPercent },
  ],
  compressor: [
    { key: 'threshold', label: 'Threshold', min: -48, max: 0, step: 0.5, defaultValue: -18, formatValue: formatDb },
    { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.1, defaultValue: 4, formatValue: formatRatio },
    { key: 'attack', label: 'Attack', min: 1, max: 100, step: 1, defaultValue: 10, formatValue: formatMs },
  ],
  delay: [
    { key: 'time', label: 'Time', min: 1, max: 1200, step: 1, defaultValue: 375, formatValue: formatMs },
    { key: 'feedback', label: 'Feedback', min: 0, max: 100, step: 1, defaultValue: 35, formatValue: formatPercent },
    { key: 'mix', label: 'Mix', min: 0, max: 100, step: 1, defaultValue: 25, formatValue: formatPercent },
  ],
  distortion: [
    { key: 'drive', label: 'Drive', min: 0, max: 100, step: 1, defaultValue: 60, formatValue: formatPercent },
    { key: 'warmth', label: 'Warmth', min: 0, max: 100, step: 1, defaultValue: 50, formatValue: formatPercent },
    { key: 'aura', label: 'Aura', min: 0, max: 100, step: 1, defaultValue: 50, formatValue: formatPercent },
    { key: 'output', label: 'Output', min: 0, max: 100, step: 1, defaultValue: 100, formatValue: formatPercent },
    { key: 'mix', label: 'Dry/Wet', min: 0, max: 100, step: 1, defaultValue: 100, formatValue: formatPercent },
  ],
  eq: [
    { key: 'low', label: 'Low', min: -12, max: 12, step: 0.1, defaultValue: 1.8, formatValue: formatDb },
    { key: 'mid', label: 'Mid', min: -12, max: 12, step: 0.1, defaultValue: -0.6, formatValue: formatDb },
    { key: 'high', label: 'High', min: -12, max: 12, step: 0.1, defaultValue: 2.1, formatValue: formatDb },
  ],
  filter: [
    { key: 'cutoff', label: 'Cutoff', min: 40, max: 20000, step: 10, defaultValue: 2500, formatValue: formatHz, scale: 'log' },
    { key: 'q', label: 'Q', min: 0.2, max: 20.0, step: 0.01, defaultValue: 0.707, formatValue: formatUnitless },
    { key: 'mode', label: 'Mode', min: 0, max: 5, step: 1, defaultValue: 0, formatValue: formatFilterMode },
    { key: 'mix', label: 'Mix', min: 0, max: 100, step: 1, defaultValue: 100, formatValue: formatPercent },
  ],
  reverb: [
    { key: 'decay', label: 'Decay', min: 0.1, max: 10.0, step: 0.1, defaultValue: 2.4, formatValue: (value) => `${value.toFixed(1)} s` },
    { key: 'damping', label: 'Damping', min: 0, max: 1, step: 0.01, defaultValue: 0.7, formatValue: formatUnitless },
    { key: 'mix', label: 'Mix', min: 0, max: 100, step: 1, defaultValue: 30, formatValue: formatPercent },
  ],
}

export const isEffectNodeKind = (kind: NodeKind): kind is EffectNodeKind => kind !== 'input' && kind !== 'output'

export const getNodeParamSpecs = (kind: NodeKind): NodeParamSpec[] => {
  if (!isEffectNodeKind(kind)) {
    return []
  }
  return EFFECT_NODE_PARAM_SPECS[kind]
}

export const getDefaultNodeParams = (kind: NodeKind): Record<string, number> =>
  getNodeParamSpecs(kind).reduce<Record<string, number>>((acc, spec) => {
    acc[spec.key] = spec.defaultValue
    return acc
  }, {})

export const getNodeParamValue = (node: GraphNode, key: string) => {
  const spec = getNodeParamSpecs(node.kind).find((item) => item.key === key)
  if (!spec) {
    return node.params[key]
  }
  return node.params[key] ?? spec.defaultValue
}

export const formatNodeParamValue = (node: GraphNode, key: string) => {
  const spec = getNodeParamSpecs(node.kind).find((item) => item.key === key)
  const value = getNodeParamValue(node, key)
  if (!spec || value === undefined) {
    return value?.toString() ?? '--'
  }
  return spec.formatValue(value)
}
