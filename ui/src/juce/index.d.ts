interface SliderState {
  getValue(): number
  setValue(v: number): void
  addListener(cb: () => void): void
  removeListener(cb: () => void): void
}

interface JuceBridge {
  getNativeFunction(name: string): (...args: unknown[]) => Promise<unknown>
  getSliderState(name: string): SliderState
  getBackendResourceAddress(path: string): string
}

declare global {
  interface Window {
    __JUCE__?: JuceBridge
  }
}

export {}
