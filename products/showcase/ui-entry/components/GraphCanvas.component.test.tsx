import { fireEvent, render, screen } from '../test/testing'
import { describe, expect, test, vi } from 'vitest'
import { createDefaultGraphState } from '../state/graphReducer'
import { GraphCanvas } from './GraphCanvas'

const DRAG_EFFECT_KIND = 'application/x-moonvst-effect-kind'
const DRAG_EFFECT_ANCHOR = 'application/x-moonvst-effect-anchor'

const createDataTransfer = () => {
  const store = new Map<string, string>()
  return {
    getData: (type: string) => store.get(type) ?? '',
    setData: (type: string, value: string) => {
      store.set(type, value)
    },
  }
}

describe('GraphCanvas', () => {
  test('drops node at cursor-aligned anchor offset', () => {
    const onAddNodeAt = vi.fn()
    const dataTransfer = createDataTransfer()
    dataTransfer.setData(DRAG_EFFECT_KIND, 'delay')
    dataTransfer.setData(DRAG_EFFECT_ANCHOR, '90,16')

    render(
      <GraphCanvas
        onAddNodeAt={onAddNodeAt}
        onCompleteConnection={vi.fn()}
        onDisconnect={vi.fn()}
        onMoveNode={vi.fn()}
        onRemoveNode={vi.fn()}
        onSelectNode={vi.fn()}
        onStartConnection={vi.fn()}
        pendingFromNodeId={null}
        state={createDefaultGraphState()}
      />,
    )

    const canvas = screen.getByRole('main', { name: 'Graph Canvas' })
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(dropEvent, 'clientX', { value: 520 })
    Object.defineProperty(dropEvent, 'clientY', { value: 280 })
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer })
    fireEvent(canvas, dropEvent)

    expect(onAddNodeAt).toHaveBeenCalledWith('delay', 430, 264)
  })
})
