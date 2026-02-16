import { act, renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { useParam } from './useParam'

describe('useParam', () => {
  test('binds to runtime param and updates through callbacks', () => {
    let listener: ((value: number) => void) | null = null
    const unsubscribe = vi.fn()
    const params = [{ index: 2, name: 'gain', min: 0, max: 1, defaultValue: 0.3 }]
    const runtime = {
      getParams: () => params,
      getParam: vi.fn(() => 0.4),
      setParam: vi.fn(),
      onParamChange: vi.fn((_index, cb) => {
        listener = cb
        return unsubscribe
      }),
    }

    const { result, unmount } = renderHook(() => useParam(runtime as never, 'gain'))

    expect(result.current.info?.name).toBe('gain')
    expect(result.current.value).toBe(0.4)

    act(() => {
      result.current.set(0.9)
    })
    expect(runtime.setParam).toHaveBeenCalledWith(2, 0.9)

    act(() => {
      listener?.(0.7)
    })
    expect(result.current.value).toBe(0.7)

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  test('returns null info when param is missing', () => {
    const runtime = {
      getParams: () => [{ index: 0, name: 'mix', min: 0, max: 1, defaultValue: 0.5 }],
      getParam: vi.fn(() => 0),
      setParam: vi.fn(),
      onParamChange: vi.fn(() => () => {}),
    }

    const { result } = renderHook(() => useParam(runtime as never, 'unknown'))

    expect(result.current.info).toBeNull()

    act(() => {
      result.current.set(0.2)
    })
    expect(runtime.setParam).not.toHaveBeenCalled()
  })
})
