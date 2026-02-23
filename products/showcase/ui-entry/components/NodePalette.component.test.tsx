import { fireEvent, render, screen } from '../test/testing'
import { describe, expect, test, vi } from 'vitest'
import { NodePalette } from './NodePalette'

const DRAG_EFFECT_KIND = 'application/x-moonvst-effect-kind'
const DRAG_EFFECT_ANCHOR = 'application/x-moonvst-effect-anchor'

const createDataTransfer = () => {
  const store = new Map<string, string>()
  return {
    getData: (type: string) => store.get(type) ?? '',
    setData: (type: string, value: string) => {
      store.set(type, value)
    },
    setDragImage: vi.fn(),
  }
}

describe('NodePalette', () => {
  test('shows Gain node in effect library', () => {
    render(<NodePalette onAddNode={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Gain' })).toBeInTheDocument()
  })

  test('uses node-like drag preview when dragging an effect', () => {
    const onAddNode = vi.fn()
    render(<NodePalette onAddNode={onAddNode} />)

    const dataTransfer = createDataTransfer()
    fireEvent.dragStart(screen.getByRole('button', { name: 'Delay' }), { dataTransfer })

    expect(dataTransfer.getData(DRAG_EFFECT_KIND)).toBe('delay')
    expect(dataTransfer.getData(DRAG_EFFECT_ANCHOR)).toBe('90,16')
    expect(dataTransfer.setDragImage).toHaveBeenCalledOnce()
    const dragPreview = dataTransfer.setDragImage.mock.calls[0]?.[0] as HTMLElement
    expect(dragPreview.textContent).toContain('IN')
    expect(dragPreview.textContent).toContain('OUT')
    const portDots = dragPreview.querySelectorAll('span[style*="background-color"]')
    expect(portDots).toHaveLength(2)
    expect((portDots[0] as HTMLElement).style.backgroundColor).toBe('rgb(34, 211, 238)')
    expect((portDots[1] as HTMLElement).style.backgroundColor).toBe('rgb(34, 211, 238)')
  })
})
