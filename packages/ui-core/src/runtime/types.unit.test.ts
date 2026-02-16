import type { AudioRuntime, ParamInfo, WebAudioRuntime } from './types'
import { describe, expect, test } from 'vitest'

function acceptAudioRuntime(runtime: AudioRuntime): AudioRuntime {
  return runtime
}

function acceptWebAudioRuntime(runtime: WebAudioRuntime): WebAudioRuntime {
  return runtime
}

describe('runtime types', () => {
  test('type contracts are satisfiable', () => {
    const param: ParamInfo = {
      index: 0,
      name: 'gain',
      min: 0,
      max: 1,
      defaultValue: 0.5,
    }

    const baseRuntime: AudioRuntime = {
      type: 'juce',
      getParams: () => [param],
      setParam: () => {},
      getParam: () => 0,
      getLevel: () => 0,
      onParamChange: () => () => {},
      dispose: () => {},
    }

    const webRuntime: WebAudioRuntime = {
      ...baseRuntime,
      type: 'web',
      loadAudioData: async () => {},
      loadAudioFile: async () => {},
      play: async () => {},
      stop: () => {},
      startMic: async () => {},
      stopMic: () => {},
      hasAudioLoaded: () => false,
      getIsPlaying: () => false,
      getInputMode: () => 'none',
      getMicState: () => 'inactive',
    }

    expect(acceptAudioRuntime(baseRuntime).type).toBe('juce')
    expect(acceptWebAudioRuntime(webRuntime).type).toBe('web')
  })
})
