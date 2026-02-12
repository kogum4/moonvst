export interface ParamInfo {
  index: number
  name: string
  min: number
  max: number
  defaultValue: number
}

export interface AudioRuntime {
  readonly type: 'juce' | 'web'
  getParams(): ParamInfo[]
  setParam(index: number, value: number): void
  getParam(index: number): number
  getLevel(): number
  onParamChange(index: number, cb: (v: number) => void): () => void
  dispose(): void
}

export interface WebAudioRuntime extends AudioRuntime {
  readonly type: 'web'
  loadAudioData(bytes: ArrayBuffer, mimeType?: string): Promise<void>
  loadAudioFile(file: File): Promise<void>
  play(): Promise<void>
  stop(): void
  hasAudioLoaded(): boolean
  getIsPlaying(): boolean
}
