import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App'
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

const baseRuntime = {
  getParams: () => [],
  setParam: () => {},
  getParam: () => 0,
  getLevel: () => 0,
  onParamChange: () => () => {},
  dispose: () => {},
}

describe('App', () => {
  beforeEach(() => {
    mockedUseRuntime.mockReset()
  })

  test('shows loading before runtime is ready', () => {
    mockedUseRuntime.mockReturnValue({ runtime: null, error: null })

    render(<App />)

    expect(screen.getByText('Loading audio runtime...')).toBeInTheDocument()
  })

  test('shows runtime init error', () => {
    mockedUseRuntime.mockReturnValue({ runtime: null, error: 'boom' })

    render(<App />)

    expect(screen.getByText('Audio runtime init failed: boom')).toBeInTheDocument()
  })

  test('renders web runtime controls including menu', () => {
    mockedUseRuntime.mockReturnValue({
      runtime: {
        ...baseRuntime,
        type: 'web' as const,
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
      },
      error: null,
    })

    render(<App />)

    expect(screen.getByRole('heading', { name: 'MoonVST' })).toBeInTheDocument()
    expect(screen.getByTestId('web-audio-menu')).toBeInTheDocument()
    expect(screen.getAllByTestId(/slider-/)).toHaveLength(6)
    expect(screen.getByTestId('level-meter')).toBeInTheDocument()
    expect(screen.getByText('Runtime: web')).toBeInTheDocument()
  })

  test('does not render web menu on juce runtime', () => {
    mockedUseRuntime.mockReturnValue({
      runtime: {
        ...baseRuntime,
        type: 'juce' as const,
      },
      error: null,
    })

    render(<App />)

    expect(screen.queryByTestId('web-audio-menu')).not.toBeInTheDocument()
    expect(screen.getByText('Runtime: juce')).toBeInTheDocument()
  })
})
