import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createWebRuntime, resolveRuntimeAssetPath } from './WebRuntime'

class MockAudioWorkletNode {
  public port: { postMessage: ReturnType<typeof vi.fn>; onmessage: ((e: any) => void) | null }
  connect = vi.fn()
  disconnect = vi.fn()

  constructor() {
    this.port = { postMessage: vi.fn(), onmessage: null }
    latestWorkletNode = this
  }
}

let latestWorkletNode: MockAudioWorkletNode | null = null

describe('createWebRuntime', () => {
  const originalFetch = globalThis.fetch
  const originalAudioContext = globalThis.AudioContext
  const originalAudioWorkletNode = (globalThis as any).AudioWorkletNode
  const originalMediaDevices = globalThis.navigator.mediaDevices
  const originalWebAssemblyCompile = WebAssembly.compile
  const originalWebAssemblyInstantiate = WebAssembly.instantiate
  let lastAudioContextOptions: AudioContextOptions | undefined

  beforeEach(() => {
    latestWorkletNode = null
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
      constructor(options?: AudioContextOptions) {
        lastAudioContextOptions = options
      }
      audioWorklet = {
        addModule: vi.fn(async () => {}),
      }
      destination = {}
      decodeAudioData = vi.fn(async () => ({}))
      createMediaElementSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }))
      createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }))
      close = vi.fn(async () => {})
      resume = vi.fn(async () => {})
      state = 'running'
    }

    vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
    vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode)
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    })

    WebAssembly.compile = vi.fn(async () => ({} as WebAssembly.Module))
    WebAssembly.instantiate = vi.fn(async () => ({ exports } as unknown as WebAssembly.Instance))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalFetch) vi.stubGlobal('fetch', originalFetch)
    if (originalAudioContext) vi.stubGlobal('AudioContext', originalAudioContext)
    if (originalAudioWorkletNode) vi.stubGlobal('AudioWorkletNode', originalAudioWorkletNode)
    if (originalMediaDevices) {
      vi.stubGlobal('navigator', { mediaDevices: originalMediaDevices })
    }
    WebAssembly.compile = originalWebAssemblyCompile
    WebAssembly.instantiate = originalWebAssemblyInstantiate
  })

  test('creates runtime and exposes parameter info', async () => {
    const runtime = await createWebRuntime()

    expect(lastAudioContextOptions).toEqual({ latencyHint: 'interactive' })
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

  test('starts and stops microphone input', async () => {
    const runtime = await createWebRuntime()
    const getUserMedia = vi.mocked(navigator.mediaDevices.getUserMedia)

    expect(runtime.getInputMode()).toBe('none')

    await runtime.startMic()
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        autoGainControl: false,
        noiseSuppression: false,
        echoCancellation: false,
      },
    })
    expect(runtime.getInputMode()).toBe('mic')
    expect(runtime.getMicState()).toBe('active')

    runtime.stopMic()
    expect(runtime.getInputMode()).toBe('none')
    expect(runtime.getMicState()).toBe('inactive')
  })


  test('applies graph payload by posting compiled runtime graph to worklet', async () => {
    const runtime = await createWebRuntime()
    runtime.applyGraphPayload?.(
      JSON.stringify({
        graphSchemaVersion: 1,
        nodes: [
          { id: 'input', kind: 'input', x: 0, y: 0, bypass: false, params: {} },
          { id: 'fx', kind: 'distortion', x: 0, y: 0, bypass: false, params: { drive: 100, mix: 50 } },
          { id: 'output', kind: 'output', x: 0, y: 0, bypass: false, params: {} },
        ],
        edges: [
          { fromNodeId: 'input', toNodeId: 'fx' },
          { fromNodeId: 'fx', toNodeId: 'output' },
        ],
      }),
    )

    expect(latestWorkletNode?.port.postMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'applyRuntimeGraph',
        schemaVersion: 1,
        hasOutputPath: 1,
        nodes: expect.any(Array),
        edges: expect.any(Array),
      }),
    )
    const runtimeGraphMessage = vi.mocked(latestWorkletNode!.port.postMessage).mock.calls[1]?.[0] as {
      nodes: Array<{ effectType: number; bypass: number; p1: number; p2: number }>
      edges: Array<{ fromIndex: number; toIndex: number }>
    }
    expect(runtimeGraphMessage.nodes).toHaveLength(3)
    expect(runtimeGraphMessage.nodes).toEqual(
      expect.arrayContaining([
        { effectType: 4, bypass: 0, p1: 1, p2: 0.5, p3: 0, p4: 0 },
      ]),
    )
    expect(runtimeGraphMessage.edges).toHaveLength(2)
    expect(latestWorkletNode?.port.postMessage).toHaveBeenNthCalledWith(1, {
      type: 'loadWasm',
      wasmBytes: expect.any(ArrayBuffer),
    })
  })
})

describe('resolveRuntimeAssetPath', () => {
  test('resolves asset path under repository base path', () => {
    expect(resolveRuntimeAssetPath('wasm/moonvst_dsp.wasm', '/moonvst/')).toBe('/moonvst/wasm/moonvst_dsp.wasm')
    expect(resolveRuntimeAssetPath('worklet/processor.js', '/moonvst/')).toBe('/moonvst/worklet/processor.js')
  })

  test('resolves asset path under root base path', () => {
    expect(resolveRuntimeAssetPath('wasm/moonvst_dsp.wasm', '/')).toBe('/wasm/moonvst_dsp.wasm')
  })
})
