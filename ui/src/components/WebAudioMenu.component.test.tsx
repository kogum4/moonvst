import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { WebAudioMenu } from './WebAudioMenu'
import { loadPersistedAudio, savePersistedAudio } from '../utils/persistedAudio'

vi.mock('../utils/persistedAudio', () => ({
  loadPersistedAudio: vi.fn(),
  savePersistedAudio: vi.fn(),
}))

const mockedLoadPersistedAudio = vi.mocked(loadPersistedAudio)
const mockedSavePersistedAudio = vi.mocked(savePersistedAudio)

function createRuntime() {
  let playing = false
  let hasAudio = false

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
})
