import { fireEvent, render, screen } from '../../../../packages/ui-core/src/test/testing'
import { describe, expect, test } from 'vitest'
import { NodeEditorShell } from './NodeEditorShell'

describe('node editor shell layout', () => {
  test('renders Pencil-mapped regions with semantic roles and region ids', () => {
    render(<NodeEditorShell />)

    expect(screen.getByRole('banner', { name: 'Top Bar' })).toHaveAttribute('data-region-id', 'FMWVd')
    expect(screen.getByRole('navigation', { name: 'Node Library' })).toHaveAttribute('data-region-id', 'XQtg4')
    expect(screen.getByRole('main', { name: 'Graph Canvas' })).toHaveAttribute('data-region-id', 'jJBPL')
    expect(screen.getByRole('complementary', { name: 'Properties Panel' })).toHaveAttribute('data-region-id', 'P0JNl')
    expect(screen.getByRole('contentinfo', { name: 'Status Bar' })).toHaveAttribute('data-region-id', 'gkrb8')
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/kogum4/moonvst')
  })

  test('updates inspector node dot color to match selected node kind', () => {
    render(<NodeEditorShell />)

    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#38BDF8')
    expect(screen.getByRole('group', { name: 'Parameter Row Decay' })).toHaveAttribute('data-param-color', '#38BDF8')

    const inputNode = screen.getByRole('group', { name: 'I/O Node INPUT' })
    fireEvent.click(inputNode)
    expect(inputNode).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#4ADE80')
    expect(screen.getByRole('group', { name: 'Parameter Row Decay' })).toHaveAttribute('data-param-color', '#4ADE80')
    expect(screen.getByTestId('connection-dot-out-0')).toHaveAttribute('data-node-color', '#FB923C')

    const outputNode = screen.getByRole('group', { name: 'I/O Node OUTPUT' })
    fireEvent.click(outputNode)
    expect(outputNode).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#FB923C')
    expect(screen.getByRole('group', { name: 'Parameter Row Decay' })).toHaveAttribute('data-param-color', '#FB923C')
    expect(screen.getByTestId('connection-dot-in-0')).toHaveAttribute('data-node-color', '#4ADE80')
  })

  test('keeps fixed connection value slots for IN and OUT rows', () => {
    render(<NodeEditorShell />)

    expect(screen.getByTestId('connections-in-value')).toBeInTheDocument()
    expect(screen.getByTestId('connections-out-value')).toBeInTheDocument()

    const inputNode = screen.getByRole('group', { name: 'I/O Node INPUT' })
    fireEvent.click(inputNode)

    expect(screen.getByTestId('connections-in-value')).toBeInTheDocument()
    expect(screen.getByTestId('connections-out-value')).toBeInTheDocument()
  })

  test('applies themed canvas scrollbar styling', () => {
    render(<NodeEditorShell />)

    const canvas = screen.getByRole('main', { name: 'Graph Canvas' })
    expect(canvas).toHaveStyle({
      scrollbarWidth: 'none',
      scrollbarColor: 'transparent transparent',
    })
    expect(canvas).toHaveAttribute('data-can-scroll-x', 'false')
    expect(canvas).toHaveAttribute('data-can-scroll-y', 'false')
  })

})
