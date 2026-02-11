import type { AudioRuntime, ParamInfo } from './types'

interface WasmExports {
  memory: WebAssembly.Memory
  dsp_init(): void
  process_block(n: number): void
  get_param_count(): number
  get_param_name(index: number): number
  get_param_name_len(index: number): number
  get_param_default(index: number): number
  get_param_min(index: number): number
  get_param_max(index: number): number
  set_param(index: number, value: number): void
  get_param(index: number): number
}

export async function createWebRuntime(): Promise<AudioRuntime> {
  const ctx = new AudioContext()

  // Load WASM binary
  const wasmResponse = await fetch('/wasm/webvst_dsp.wasm')
  const wasmBytes = await wasmResponse.arrayBuffer()
  const wasmModule = await WebAssembly.compile(wasmBytes)

  // Register AudioWorklet processor
  await ctx.audioWorklet.addModule('/worklet/processor.js')

  // Also instantiate WASM on main thread for parameter queries
  const instance = await WebAssembly.instantiate(wasmModule)
  const exports = instance.exports as unknown as WasmExports
  exports.dsp_init()

  // Build parameter info
  const count = exports.get_param_count()
  const params: ParamInfo[] = []

  for (let i = 0; i < count; i++) {
    const ptr = exports.get_param_name(i)
    const len = exports.get_param_name_len(i)
    const bytes = new Uint8Array(exports.memory.buffer, ptr, len)
    const name = new TextDecoder().decode(bytes)

    params.push({
      index: i,
      name,
      min: exports.get_param_min(i),
      max: exports.get_param_max(i),
      defaultValue: exports.get_param_default(i),
    })
  }

  // Create AudioWorklet node
  const workletNode = new AudioWorkletNode(ctx, 'webvst-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  })

  // Send WASM bytes to worklet
  workletNode.port.postMessage({ type: 'loadWasm', wasmBytes })

  // Connect to destination
  workletNode.connect(ctx.destination)

  // Parameter change listeners
  const listeners = new Map<number, Set<(v: number) => void>>()

  return {
    type: 'web',

    getParams() {
      return params
    },

    setParam(index: number, value: number) {
      exports.set_param(index, value)
      workletNode.port.postMessage({ type: 'setParam', index, value })

      // Notify listeners
      const cbs = listeners.get(index)
      if (cbs) cbs.forEach(cb => cb(value))
    },

    getParam(index: number) {
      return exports.get_param(index)
    },

    onParamChange(index: number, cb: (v: number) => void) {
      if (!listeners.has(index)) listeners.set(index, new Set())
      listeners.get(index)!.add(cb)
      return () => { listeners.get(index)?.delete(cb) }
    },

    dispose() {
      workletNode.disconnect()
      ctx.close()
    },
  }
}
