import { render, screen } from './test/testing'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import ShowcaseApp from './App'
import { useRuntime } from '../../../packages/ui-core/src/runtime/useRuntime'

vi.mock('../../../packages/ui-core/src/runtime/useRuntime', () => ({
  useRuntime: vi.fn(),
}))

vi.mock('../../../packages/ui-core/src/components/WebAudioMenu', () => ({
  WebAudioMenu: () => <div data-testid="showcase-web-audio-menu">WebAudioMenu</div>,
}))

const mockedUseRuntime = vi.mocked(useRuntime)

const webRuntime = {
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
    mockedUseRuntime.mockReturnValue({ runtime: webRuntime, error: null })
  })

  test('renders node editor shell regions', () => {
    render(<ShowcaseApp />)

    expect(screen.getByRole('banner', { name: 'Top Bar' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Node Library' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Graph Canvas' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Properties Panel' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo', { name: 'Status Bar' })).toBeInTheDocument()
  })

  test('shows web audio source controls only for web runtime', () => {
    render(<ShowcaseApp />)

    expect(screen.getByTestId('showcase-web-audio-menu')).toBeInTheDocument()
  })

  test('hides web audio source controls for juce runtime', () => {
    mockedUseRuntime.mockReturnValue({
      runtime: {
        type: 'juce',
        getParams: () => [],
        setParam: () => {},
        getParam: () => 0,
        getLevel: () => 0,
        onParamChange: () => () => {},
        dispose: () => {},
      },
      error: null,
    })

    render(<ShowcaseApp />)

    expect(screen.queryByTestId('showcase-web-audio-menu')).not.toBeInTheDocument()
  })
})
