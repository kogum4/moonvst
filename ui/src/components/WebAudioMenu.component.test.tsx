import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { WebAudioMenu } from '../../../packages/ui-core/src/components/WebAudioMenu'
import { loadPersistedAudio, savePersistedAudio } from '../../../packages/ui-core/src/utils/persistedAudio'

vi.mock('../../../packages/ui-core/src/utils/persistedAudio', () => ({
  loadPersistedAudio: vi.fn(),
  savePersistedAudio: vi.fn(),
}))

const mockedLoadPersistedAudio = vi.mocked(loadPersistedAudio)
const mockedSavePersistedAudio = vi.mocked(savePersistedAudio)

function createRuntime() {
  let playing = false
  let hasAudio = false
  let inputMode: 'none' | 'file' | 'mic' = 'none'
  let micState: 'inactive' | 'requesting' | 'active' | 'denied' | 'error' = 'inactive'

  return {
    type: 'web' as const,
    getParams: () => [],
    setParam: () => {},
    getParam: () => 0,
    getLevel: () => 0,
    onParamChange: () => () => {},
    dispose: () => {},
    loadAudioData: vi.fn(async () => {
      hasAudio = true
      playing = false
      inputMode = 'file'
    }),
    loadAudioFile: vi.fn(async () => {}),
    play: vi.fn(async () => {
      playing = true
    }),
    stop: vi.fn(() => {
      playing = false
    }),
    hasAudioLoaded: vi.fn(() => hasAudio),
    getIsPlaying: vi.fn(() => playing),
    startMic: vi.fn(async () => {
      inputMode = 'mic'
      micState = 'active'
      hasAudio = false
      playing = false
    }),
    stopMic: vi.fn(() => {
      inputMode = 'none'
      micState = 'inactive'
      playing = false
    }),
    getInputMode: vi.fn(() => inputMode),
    getMicState: vi.fn(() => micState),
  }
}

describe('WebAudioMenu', () => {
  beforeEach(() => {
    mockedLoadPersistedAudio.mockReset()
    mockedSavePersistedAudio.mockReset()
    mockedLoadPersistedAudio.mockResolvedValue(null)
  })

  test('renders initial state without audio', () => {
    const runtime = createRuntime()
    render(<WebAudioMenu runtime={runtime} />)

    expect(screen.getByText('No file selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
  })

  test('restores persisted audio on mount', async () => {
    const runtime = createRuntime()
    const bytes = new Uint8Array([1, 2, 3]).buffer
    mockedLoadPersistedAudio.mockResolvedValue({
      name: 'loop.wav',
      mimeType: 'audio/wav',
      bytes,
      updatedAt: 1,
    })

    render(<WebAudioMenu runtime={runtime} />)

    await waitFor(() => {
      expect(runtime.loadAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'audio/wav')
    })
    expect(screen.getByText('loop.wav')).toBeInTheDocument()
  })

  test('loads selected file and persists it', async () => {
    const runtime = createRuntime()
    const { container } = render(<WebAudioMenu runtime={runtime} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(['abc'], 'sample.wav', { type: 'audio/wav' })
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn(async () => new Uint8Array([9, 8, 7]).buffer),
    })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(runtime.loadAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'audio/wav')
    })
    expect(mockedSavePersistedAudio).toHaveBeenCalled()
    expect(screen.getByText('sample.wav')).toBeInTheDocument()
  })

  test('toggles play and stop', async () => {
    const runtime = createRuntime()
    ;(runtime.hasAudioLoaded as ReturnType<typeof vi.fn>).mockReturnValue(true)

    render(<WebAudioMenu runtime={runtime} />)

    const playButton = screen.getByRole('button', { name: 'Play' })
    expect(playButton).toBeEnabled()

    fireEvent.click(playButton)
    await waitFor(() => expect(runtime.play).toHaveBeenCalled())

    const stopButton = screen.getByRole('button', { name: 'Stop' })
    fireEvent.click(stopButton)
    expect(runtime.stop).toHaveBeenCalled()
  })

  test('switches to mic mode and toggles mic start/stop', async () => {
    const runtime = createRuntime()
    render(<WebAudioMenu runtime={runtime} />)

    fireEvent.click(screen.getByRole('button', { name: 'Microphone' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Mic' }))

    await waitFor(() => expect(runtime.startMic).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Stop Mic' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Stop Mic' }))
    expect(runtime.stopMic).toHaveBeenCalled()
  })
})
