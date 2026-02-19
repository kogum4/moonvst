import { fireEvent, render, screen } from '../../../../packages/ui-core/src/test/testing'
import { describe, expect, test } from 'vitest'
import { NodeEditorShell } from './NodeEditorShell'

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
    fireEvent.click(screen.getByRole('button', { name: 'Input OUT port' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chorus IN port' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chorus OUT port' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delay IN port' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delay OUT port' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chorus IN port' }))

    expect(screen.getAllByText('ERR_CYCLE_DETECTED').length).toBeGreaterThan(0)
  })

  test('disconnects edge and updates selection state', async () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Chorus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Input OUT port' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chorus IN port' }))

    const chorusNode = screen.getByRole('group', { name: 'Effect Node Chorus' })
    fireEvent.click(chorusNode)
    expect(chorusNode).toHaveAttribute('data-selected', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Input -> Chorus' }))

    expect(screen.queryByRole('button', { name: 'Disconnect Input -> Chorus' })).not.toBeInTheDocument()
  })

})
