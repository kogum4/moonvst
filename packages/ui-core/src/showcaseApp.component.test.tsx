import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ShowcaseApp from '../../../products/showcase/ui-entry/App'
import { useRuntime } from './runtime/useRuntime'

vi.mock('./runtime/useRuntime', () => ({
  useRuntime: vi.fn(),
}))

vi.mock('./components/GainSlider', () => ({
  GainSlider: ({ paramName }: { paramName: string }) => <div data-testid={`slider-${paramName}`}>{paramName}</div>,
}))

vi.mock('./components/LevelMeter', () => ({
  LevelMeter: () => <div data-testid="level-meter">LevelMeter</div>,
}))

vi.mock('./components/WebAudioMenu', () => ({
  WebAudioMenu: () => <div data-testid="web-audio-menu">WebAudioMenu</div>,
}))

const mockedUseRuntime = vi.mocked(useRuntime)

const runtime = {
  type: 'web' as const,
  getParams: () => [],
  setParam: () => {},
  getParam: () => 0,
  getLevel: () => 0,
  onParamChange: () => () => {},
  dispose: () => {},
  loadAudioData: async () => {},
  loadAudioFile: async () => {},
  play: async () => {},
  stop: () => {},
  startMic: async () => {},
  stopMic: () => {},
  hasAudioLoaded: () => false,
  getIsPlaying: () => false,
  getInputMode: () => 'none' as const,
  getMicState: () => 'inactive' as const,
}

describe('showcase product app', () => {
  beforeEach(() => {
    mockedUseRuntime.mockReset()
  })

  test('renders six sliders and level meter', () => {
    mockedUseRuntime.mockReturnValue({ runtime, error: null })

    render(<ShowcaseApp />)

    expect(screen.getAllByTestId(/slider-/)).toHaveLength(6)
    expect(screen.getByTestId('slider-gain')).toBeInTheDocument()
    expect(screen.getByTestId('slider-pre_delay_ms')).toBeInTheDocument()
    expect(screen.getByTestId('slider-decay')).toBeInTheDocument()
    expect(screen.getByTestId('slider-damping')).toBeInTheDocument()
    expect(screen.getByTestId('slider-diffusion')).toBeInTheDocument()
    expect(screen.getByTestId('slider-mix')).toBeInTheDocument()
    expect(screen.getByTestId('level-meter')).toBeInTheDocument()
  })
})
