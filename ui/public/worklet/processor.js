/**
 * WebVST AudioWorklet Processor
 * Runs WASM DSP in the audio thread via AudioWorklet.
 */
class WebVSTProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.wasmInstance = null
    this.wasmMemory = null
    this.ready = false
    this.levelPeak = 0
    this.levelSampleCounter = 0
    this.levelEmitIntervalSamples = Math.max(1, Math.floor(sampleRate * 0.05))

    // Memory offsets (must match dsp/src/utils/constants.mbt)
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
        this.ready = true
        this.port.postMessage({ type: 'ready' })
      } catch (err) {
        this.port.postMessage({ type: 'error', message: err.message })
      }
    } else if (data.type === 'setParam' && this.wasmInstance) {
      this.wasmInstance.exports.set_param(data.index, data.value)
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
    if (input[0]) {
      const inLOffset = this.INPUT_LEFT_OFFSET / bytesPerFloat
      mem.set(input[0], inLOffset)
    }
    if (input[1]) {
      const inROffset = this.INPUT_RIGHT_OFFSET / bytesPerFloat
      mem.set(input[1], inROffset)
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

registerProcessor('webvst-processor', WebVSTProcessor)
