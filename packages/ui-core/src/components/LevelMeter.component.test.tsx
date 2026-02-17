import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { LevelMeter } from './LevelMeter'

describe('LevelMeter', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('polls runtime level and clamps to 0..1 range', () => {
    vi.useFakeTimers()
    const runtime = {
      getLevel: vi.fn()
        .mockReturnValueOnce(1.5)
        .mockReturnValueOnce(-0.25)
        .mockReturnValue(0.5),
    }

    const { container } = render(<LevelMeter runtime={runtime as never} />)

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(screen.getByText('1.000')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(screen.getByText('0.000')).toBeInTheDocument()

    const meterFill = container.querySelector('div[style*="width"]') as HTMLElement | null
    expect(meterFill?.style.width).toBe('0%')
  })

  test('cleans interval on unmount', () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const runtime = { getLevel: vi.fn().mockReturnValue(0.1) }

    const { unmount } = render(<LevelMeter runtime={runtime as never} />)
    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
