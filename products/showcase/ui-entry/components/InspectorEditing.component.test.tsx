import { fireEvent, render, screen, within } from '../../../../packages/ui-core/src/test/testing'
import { describe, expect, test } from 'vitest'
import { NodeEditorShell } from './NodeEditorShell'

describe('inspector editing flow', () => {
  test('renders selected node metadata', () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Delay' }))
    fireEvent.click(screen.getByRole('group', { name: 'Effect Node Delay' }))

    expect(screen.getByText('META')).toBeInTheDocument()
    expect(screen.queryByText('STATE')).not.toBeInTheDocument()
    expect(screen.getByTestId('inspector-meta-id')).toHaveTextContent('fx-1')
    expect(screen.getByTestId('inspector-meta-type')).toHaveTextContent('Delay')
    expect(screen.getByTestId('inspector-meta-position')).toHaveTextContent('220, 40')
  })

  test('updates parameter value in graph state via inspector control', () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Delay' }))
    fireEvent.click(screen.getByRole('group', { name: 'Effect Node Delay' }))

    const mixSlider = screen.getByRole('slider', { name: 'Mix' })
    fireEvent.change(mixSlider, { target: { value: '80' } })

    expect(mixSlider).toHaveValue('80')

    fireEvent.click(screen.getByRole('group', { name: 'I/O Node INPUT' }))
    fireEvent.click(screen.getByRole('group', { name: 'Effect Node Delay' }))
    expect(screen.getByRole('slider', { name: 'Mix' })).toHaveValue('80')
  })

  test('toggles bypass and renders connection summary for selected node', () => {
    render(<NodeEditorShell />)

    fireEvent.click(screen.getByRole('button', { name: 'Delay' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Input OUT port' }), { clientX: 200, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Delay IN port' }), { clientX: 320, clientY: 220 })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Delay OUT port' }), { clientX: 380, clientY: 220 })
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Output IN port' }), { clientX: 540, clientY: 220 })

    const delayNode = screen.getByRole('group', { name: 'Effect Node Delay' })
    fireEvent.click(delayNode)

    const inSummary = screen.getByTestId('connections-in-value')
    const outSummary = screen.getByTestId('connections-out-value')
    expect(within(inSummary).getByText('Input')).toBeInTheDocument()
    expect(within(outSummary).getByText('Output')).toBeInTheDocument()

    expect(delayNode).toHaveAttribute('data-bypassed', 'false')
    const bypassToggle = screen.getByRole('button', { name: 'Bypass Delay' })
    expect(bypassToggle).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(bypassToggle)
    expect(delayNode).toHaveAttribute('data-bypassed', 'true')
    expect(bypassToggle).toHaveAttribute('aria-pressed', 'false')
  })
})
