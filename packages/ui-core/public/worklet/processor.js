/**
 * MoonVST AudioWorklet Processor
 * Runs WASM DSP in the audio thread via AudioWorklet.
 */
class MoonVSTProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.wasmInstance = null
    this.wasmMemory = null
    this.ready = false
    this.levelPeak = 0
    this.levelSampleCounter = 0
    this.levelEmitIntervalSamples = Math.max(1, Math.floor(sampleRate * 0.05))
    this.pendingGraphContract = null
    this.pendingGraphRuntime = null
    this.pendingRuntimeGraph = null

    // Memory offsets (must match packages/dsp-core/src/utils/constants.mbt)
    this.INPUT_LEFT_OFFSET = 0x10000
    this.INPUT_RIGHT_OFFSET = 0x20000
    this.OUTPUT_LEFT_OFFSET = 0x30000
    this.OUTPUT_RIGHT_OFFSET = 0x40000

    this.port.onmessage = (e) => this.handleMessage(e.data)
  }

  async handleMessage(data) {
    if (data.type === 'loadWasm') {
      try {
        const module = await WebAssembly.compile(data.wasmBytes)
        const instance = await WebAssembly.instantiate(module)
        this.wasmInstance = instance
        this.wasmMemory = instance.exports.memory
        instance.exports.dsp_init()
        if (this.pendingGraphContract) {
          this.applyGraphContract(this.pendingGraphContract)
        }
        if (this.pendingGraphRuntime) {
          this.applyGraphRuntime(this.pendingGraphRuntime)
        }
        if (this.pendingRuntimeGraph) {
          this.applyRuntimeGraph(this.pendingRuntimeGraph)
        }
        this.ready = true
        this.port.postMessage({ type: 'ready' })
      } catch (err) {
        this.port.postMessage({ type: 'error', message: err.message })
      }
    } else if (data.type === 'setParam' && this.wasmInstance) {
      this.wasmInstance.exports.set_param(data.index, data.value)
    } else if (data.type === 'applyGraphContract') {
      this.pendingGraphContract = {
        schemaVersion: data.schemaVersion,
        nodeCount: data.nodeCount,
        edgeCount: data.edgeCount,
      }
      this.applyGraphContract(this.pendingGraphContract)
    } else if (data.type === 'applyGraphRuntime') {
      this.pendingGraphRuntime = {
        hasOutputPath: data.hasOutputPath,
        effectType: data.effectType,
      }
      this.applyGraphRuntime(this.pendingGraphRuntime)
    } else if (data.type === 'applyRuntimeGraph') {
      this.pendingRuntimeGraph = {
        schemaVersion: data.schemaVersion,
        hasOutputPath: data.hasOutputPath,
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        edges: Array.isArray(data.edges) ? data.edges : [],
      }
      this.applyRuntimeGraph(this.pendingRuntimeGraph)
    }
  }

  applyGraphContract(contract) {
    if (!this.wasmInstance || typeof this.wasmInstance.exports.apply_graph_contract !== 'function') {
      return
    }
    const schemaVersion = Number(contract?.schemaVersion ?? 0)
    const nodeCount = Number(contract?.nodeCount ?? 0)
    const edgeCount = Number(contract?.edgeCount ?? 0)
    if (!Number.isInteger(schemaVersion) || !Number.isInteger(nodeCount) || !Number.isInteger(edgeCount)) {
      return
    }
    this.wasmInstance.exports.apply_graph_contract(schemaVersion, nodeCount, edgeCount)
  }

  applyGraphRuntime(runtimeMode) {
    if (!this.wasmInstance || typeof this.wasmInstance.exports.apply_graph_runtime_mode !== 'function') {
      return
    }
    const hasOutputPath = Number(runtimeMode?.hasOutputPath ?? 0)
    const effectType = Number(runtimeMode?.effectType ?? 0)
    if (!Number.isInteger(hasOutputPath) || !Number.isInteger(effectType)) {
      return
    }
    this.wasmInstance.exports.apply_graph_runtime_mode(hasOutputPath, effectType)
  }

  applyRuntimeGraph(runtimeGraph) {
    if (!this.wasmInstance) {
      return
    }

    const schemaVersion = Number(runtimeGraph?.schemaVersion ?? 0)
    const hasOutputPath = Number(runtimeGraph?.hasOutputPath ?? 0)
    const nodes = Array.isArray(runtimeGraph?.nodes) ? runtimeGraph.nodes : []
    const edges = Array.isArray(runtimeGraph?.edges) ? runtimeGraph.edges : []
    if (!Number.isInteger(schemaVersion) || !Number.isInteger(hasOutputPath)) {
      return
    }

    const clearFn =
      this.wasmInstance.exports.runtime_graph_clear
      ?? this.wasmInstance.exports.clear_runtime_graph
    const setNodeFn =
      this.wasmInstance.exports.runtime_graph_set_node
      ?? this.wasmInstance.exports.set_runtime_node
    const setEdgeFn =
      this.wasmInstance.exports.runtime_graph_set_edge
      ?? this.wasmInstance.exports.set_runtime_edge
    const hasRuntimeGraphApi =
      typeof clearFn === 'function'
      && typeof setNodeFn === 'function'
      && typeof setEdgeFn === 'function'

    if (hasRuntimeGraphApi) {
      clearFn()
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i] ?? {}
        setNodeFn(
          i,
          Number(node.effectType ?? 0),
          Number(node.bypass ?? 0),
          Number(node.p1 ?? 0),
          Number(node.p2 ?? 0),
          Number(node.p3 ?? 0),
          Number(node.p4 ?? 0),
          Number(node.p5 ?? 0),
          Number(node.p6 ?? 0),
          Number(node.p7 ?? 0),
          Number(node.p8 ?? 0),
          Number(node.p9 ?? 0),
        )
      }
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i] ?? {}
        setEdgeFn(
          i,
          Number(edge.fromIndex ?? -1),
          Number(edge.toIndex ?? -1),
        )
      }
    } else {
      // Runtime graph API unavailable: select first effect node.
      let fallbackEffectType = 0
      for (let i = 0; i < nodes.length; i++) {
        const effectType = Number(nodes[i]?.effectType ?? 0)
        if (Number.isInteger(effectType) && effectType > 0) {
          fallbackEffectType = effectType
          break
        }
      }
      this.applyGraphRuntime({
        hasOutputPath,
        effectType: fallbackEffectType,
      })
    }

    this.applyGraphContract({
      schemaVersion,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    })
    if (hasRuntimeGraphApi) {
      this.applyGraphRuntime({
        hasOutputPath,
        effectType: 0,
      })
    }
  }

  process(inputs, outputs) {
    if (!this.ready || !this.wasmInstance) return true

    const input = inputs[0]
    const output = outputs[0]
    const numSamples = output[0]?.length ?? 0

    if (numSamples === 0) return true

    const mem = new Float32Array(this.wasmMemory.buffer)
    const bytesPerFloat = 4

    // Copy input to WASM memory
    const inLOffset = this.INPUT_LEFT_OFFSET / bytesPerFloat
    const inROffset = this.INPUT_RIGHT_OFFSET / bytesPerFloat
    if (input[0]) {
      mem.set(input[0], inLOffset)
    } else {
      mem.fill(0, inLOffset, inLOffset + numSamples)
    }
    if (input[1]) {
      mem.set(input[1], inROffset)
    } else if (input[0]) {
      mem.set(input[0], inROffset)
    } else {
      mem.fill(0, inROffset, inROffset + numSamples)
    }

    // Process
    this.wasmInstance.exports.process_block(numSamples)

    // Copy output from WASM memory
    const outLOffset = this.OUTPUT_LEFT_OFFSET / bytesPerFloat
    const outROffset = this.OUTPUT_RIGHT_OFFSET / bytesPerFloat

    if (output[0]) {
      output[0].set(mem.subarray(outLOffset, outLOffset + numSamples))
    }
    if (output[1]) {
      output[1].set(mem.subarray(outROffset, outROffset + numSamples))
    }

    let blockPeak = 0
    const outL = output[0]
    const outR = output[1]
    if (outL) {
      for (let i = 0; i < outL.length; i++) {
        const v = Math.abs(outL[i])
        if (v > blockPeak) blockPeak = v
      }
    }
    if (outR) {
      for (let i = 0; i < outR.length; i++) {
        const v = Math.abs(outR[i])
        if (v > blockPeak) blockPeak = v
      }
    }

    if (blockPeak > this.levelPeak) this.levelPeak = blockPeak
    this.levelSampleCounter += numSamples
    if (this.levelSampleCounter >= this.levelEmitIntervalSamples) {
      this.port.postMessage({ type: 'level', value: Math.min(1, this.levelPeak) })
      this.levelPeak = 0
      this.levelSampleCounter = 0
    }

    return true
  }
}

registerProcessor('moonvst-processor', MoonVSTProcessor)

