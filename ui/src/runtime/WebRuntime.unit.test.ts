import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createWebRuntime } from './WebRuntime'

class MockAudioWorkletNode {
  public port: { postMessage: ReturnType<typeof vi.fn>; onmessage: ((e: any) => void) | null }
  connect = vi.fn()
  disconnect = vi.fn()

  constructor() {
    this.port = { postMessage: vi.fn(), onmessage: null }
  }
}

describe('createWebRuntime', () => {
  const originalFetch = globalThis.fetch
  const originalAudioContext = globalThis.AudioContext
  const originalAudioWorkletNode = (globalThis as any).AudioWorkletNode
  const originalWebAssemblyCompile = WebAssembly.compile
  const originalWebAssemblyInstantiate = WebAssembly.instantiate

  beforeEach(() => {
    const memory = new WebAssembly.Memory({ initial: 1 })
    const encoder = new TextEncoder()
    const nameBytes = encoder.encode('gain')
    new Uint8Array(memory.buffer, 0, nameBytes.length).set(nameBytes)

    const exports = {
      memory,
      dsp_init: vi.fn(),
      process_block: vi.fn(),
      get_param_count: vi.fn(() => 1),
      get_param_name: vi.fn(() => 0),
      get_param_name_len: vi.fn(() => nameBytes.length),
      get_param_default: vi.fn(() => 0.5),
      get_param_min: vi.fn(() => 0),
      get_param_max: vi.fn(() => 1),
      set_param: vi.fn(),
      get_param: vi.fn(() => 0.5),
    }

    vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))

    class MockAudioContext {
      audioWorklet = {
        addModule: vi.fn(async () => {}),
      }
      destination = {}
      decodeAudioData = vi.fn(async () => ({}))
      createMediaElementSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }))
      close = vi.fn(async () => {})
      resume = vi.fn(async () => {})
      state = 'running'
    }

    vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
    vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode)

    WebAssembly.compile = vi.fn(async () => ({} as WebAssembly.Module))
    WebAssembly.instantiate = vi.fn(async () => ({ exports } as unknown as WebAssembly.Instance))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalFetch) vi.stubGlobal('fetch', originalFetch)
    if (originalAudioContext) vi.stubGlobal('AudioContext', originalAudioContext)
    if (originalAudioWorkletNode) vi.stubGlobal('AudioWorkletNode', originalAudioWorkletNode)
    WebAssembly.compile = originalWebAssemblyCompile
    WebAssembly.instantiate = originalWebAssemblyInstantiate
  })

  test('creates runtime and exposes parameter info', async () => {
    const runtime = await createWebRuntime()

    expect(runtime.type).toBe('web')
    expect(runtime.getParams()).toEqual([
      { index: 0, name: 'gain', min: 0, max: 1, defaultValue: 0.5 },
    ])

    runtime.setParam(0, 0.9)
    expect(runtime.getParam(0)).toBe(0.5)

    runtime.dispose()
  })

  test('throws when wasm fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down')
    }))

    await expect(createWebRuntime()).rejects.toThrow('network down')
  })
})
