import { fireEvent, render, screen } from '../test/testing'
import { describe, expect, test } from 'vitest'
import { NodeEditorShell } from './NodeEditorShell'

const DRAG_EFFECT_ANCHOR = 'application/x-moonvst-effect-anchor'

const createDataTransfer = () => {
  const store = new Map<string, string>()
  return {
    setData: (type: string, value: string) => {
      store.set(type, value)
    },
    getData: (type: string) => store.get(type) ?? '',
  }
}

describe('canvas interaction flow', () => {
  test('adds a node by drag and drop from library to canvas', async () => {
    render(<NodeEditorShell />)

    expect(screen.queryByRole('group', { name: 'Effect Node Delay' })).not.toBeInTheDocument()

    const dataTransfer = createDataTransfer()
    fireEvent.dragStart(screen.getByRole('button', { name: 'Delay' }), { dataTransfer })
    expect(dataTransfer.getData(DRAG_EFFECT_ANCHOR)).toBe('90,16')
    fireEvent.dragOver(screen.getByRole('main', { name: 'Graph Canvas' }), { dataTransfer })
    fireEvent.drop(screen.getByRole('main', { name: 'Graph Canvas' }), {
      clientX: 520,
      clientY: 280,
      dataTransfer,
    })

    expect(screen.getByRole('group', { name: 'Effect Node Delay' })).toBeInTheDocument()
  })

  test('connects out->in and rejects cycle-producing connection', async () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delay' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Input OUT port' }), { clientX: 200, clientY: 220 })
    fireEvent.pointerMove(window, { clientX: 320, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Chorus IN port' }), { clientX: 320, clientY: 220 })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chorus OUT port' }), { clientX: 380, clientY: 220 })
    fireEvent.pointerMove(window, { clientX: 540, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Delay IN port' }), { clientX: 540, clientY: 220 })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Delay OUT port' }), { clientX: 580, clientY: 220 })
    fireEvent.pointerMove(window, { clientX: 340, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Chorus IN port' }), { clientX: 340, clientY: 220 })

    expect(screen.getAllByText('ERR_CYCLE_DETECTED').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Wire Input -> Output')).toBeInTheDocument()
  })

  test('disconnects edge and updates selection state', async () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Input OUT port' }), { clientX: 200, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Chorus IN port' }), { clientX: 320, clientY: 220 })

    const chorusNode = screen.getByRole('group', { name: 'Effect Node Chorus' })
    fireEvent.click(chorusNode)
    expect(chorusNode).toHaveAttribute('data-selected', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Input -> Chorus' }))

    expect(screen.queryByRole('button', { name: 'Disconnect Input -> Chorus' })).not.toBeInTheDocument()
  })

  test('deletes selected node via Delete and Backspace keys', async () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delay' }))

    const chorusNode = screen.getByRole('group', { name: 'Effect Node Chorus' })
    fireEvent.click(chorusNode)
    expect(chorusNode).toHaveAttribute('data-selected', 'true')

    fireEvent.keyDown(window, { key: 'Delete' })
    expect(screen.queryByRole('group', { name: 'Effect Node Chorus' })).not.toBeInTheDocument()

    const delayNode = screen.getByRole('group', { name: 'Effect Node Delay' })
    fireEvent.click(delayNode)
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(screen.queryByRole('group', { name: 'Effect Node Delay' })).not.toBeInTheDocument()
  })

  test('deletes node from right-click context menu', async () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))

    const chorusNode = screen.getByRole('group', { name: 'Effect Node Chorus' })
    fireEvent.contextMenu(chorusNode)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(screen.queryByRole('group', { name: 'Effect Node Chorus' })).not.toBeInTheDocument()
  })

  test('does not emit IO-required error when deleting fixed input/output nodes via keyboard', async () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('group', { name: 'I/O Node INPUT' }))
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(screen.queryByText('ERR_IO_NODE_REQUIRED')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('group', { name: 'I/O Node OUTPUT' }))
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(screen.queryByText('ERR_IO_NODE_REQUIRED')).not.toBeInTheDocument()
  })

  test('deletes connected node and removes its incident wires', async () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Input OUT port' }), { clientX: 200, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Chorus IN port' }), { clientX: 320, clientY: 220 })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chorus OUT port' }), { clientX: 380, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Output IN port' }), { clientX: 540, clientY: 220 })

    const chorusNode = screen.getByRole('group', { name: 'Effect Node Chorus' })
    fireEvent.click(chorusNode)
    fireEvent.keyDown(window, { key: 'Delete' })

    expect(screen.queryByRole('group', { name: 'Effect Node Chorus' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Wire Input -> Chorus')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Wire Chorus -> Output')).not.toBeInTheDocument()
  })
})
