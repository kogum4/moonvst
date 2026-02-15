import type { ParamInfo, WebAudioRuntime } from './types'

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

export function resolveRuntimeAssetPath(assetPath: string, baseUrl = import.meta.env.BASE_URL): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${assetPath.replace(/^\//, '')}`
}

export async function createWebRuntime(): Promise<WebAudioRuntime> {
  const ctx = new AudioContext()
  const wasmPath = resolveRuntimeAssetPath('wasm/moonvst_dsp.wasm')
  const workletPath = resolveRuntimeAssetPath('worklet/processor.js')

  // Load WASM binary
  const wasmResponse = await fetch(wasmPath)
  const wasmBytes = await wasmResponse.arrayBuffer()
  const wasmModule = await WebAssembly.compile(wasmBytes)

  // Register AudioWorklet processor
  await ctx.audioWorklet.addModule(workletPath)

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
  const workletNode = new AudioWorkletNode(ctx, 'moonvst-processor', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2],
  })

  // Send WASM bytes to worklet
  workletNode.port.postMessage({ type: 'loadWasm', wasmBytes })

  // Connect to destination
  workletNode.connect(ctx.destination)

  let audioElement: HTMLAudioElement | null = null
  let mediaSourceNode: MediaElementAudioSourceNode | null = null
  let audioUrl: string | null = null
  let hasAudio = false
  let isPlaying = false
  let currentLevel = 0

  workletNode.port.onmessage = (event) => {
    const data = event.data as { type?: string; value?: number; message?: string }
    if (data?.type === 'level' && typeof data.value === 'number' && Number.isFinite(data.value)) {
      currentLevel = Math.max(0, Math.min(1, data.value))
      return
    }
    if (data?.type === 'error') {
      console.error('AudioWorklet processor error:', data.message)
    }
  }

  const ensureAudioGraph = () => {
    if (!audioElement) {
      audioElement = new Audio()
      audioElement.loop = true
      audioElement.crossOrigin = 'anonymous'
      audioElement.preload = 'auto'
      audioElement.addEventListener('play', () => {
        isPlaying = true
      })
      audioElement.addEventListener('pause', () => {
        isPlaying = false
      })
      mediaSourceNode = ctx.createMediaElementSource(audioElement)
      mediaSourceNode.connect(workletNode)
    }
  }

  const resetPlaybackState = () => {
    hasAudio = false
    isPlaying = false
    currentLevel = 0
    if (!audioElement) return
    audioElement.pause()
    audioElement.currentTime = 0
  }

  const validateAudioData = async (bytes: ArrayBuffer) => {
    await ctx.decodeAudioData(bytes.slice(0))
  }

  const loadAudioDataInternal = async (bytes: ArrayBuffer, mimeType?: string) => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      audioUrl = null
    }

    resetPlaybackState()
    ensureAudioGraph()
    await validateAudioData(bytes)

    if (!audioElement) {
      throw new Error('Audio element is not ready')
    }

    const blob = mimeType ? new Blob([bytes], { type: mimeType }) : new Blob([bytes])
    audioUrl = URL.createObjectURL(blob)
    audioElement.src = audioUrl

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup()
        hasAudio = true
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(new Error('Failed to load selected audio data'))
      }
      const cleanup = () => {
        audioElement?.removeEventListener('loadeddata', onLoaded)
        audioElement?.removeEventListener('error', onError)
      }

      audioElement.addEventListener('loadeddata', onLoaded, { once: true })
      audioElement.addEventListener('error', onError, { once: true })
    })
  }

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

    getLevel() {
      return currentLevel
    },

    async loadAudioData(bytes: ArrayBuffer, mimeType?: string) {
      await loadAudioDataInternal(bytes, mimeType)
    },

    async loadAudioFile(file: File) {
      const bytes = await file.arrayBuffer()
      await loadAudioDataInternal(bytes, file.type)
    },

    async play() {
      if (!audioElement || !hasAudio) return

      if (ctx.state === 'suspended') {
        await ctx.resume()
      }

      await audioElement.play()
      isPlaying = true
    },

    stop() {
      if (!audioElement) return
      audioElement.pause()
      audioElement.currentTime = 0
      isPlaying = false
      currentLevel = 0
    },

    hasAudioLoaded() {
      return hasAudio
    },

    getIsPlaying() {
      return isPlaying
    },

    onParamChange(index: number, cb: (v: number) => void) {
      if (!listeners.has(index)) listeners.set(index, new Set())
      listeners.get(index)!.add(cb)
      return () => { listeners.get(index)?.delete(cb) }
    },

    dispose() {
      currentLevel = 0
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      mediaSourceNode?.disconnect()
      workletNode.disconnect()
      ctx.close()
    },
  }
}
