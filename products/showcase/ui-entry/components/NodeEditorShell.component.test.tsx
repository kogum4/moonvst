import { fireEvent, render, screen } from '../test/testing'
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
    expect(screen.getByText('No editable parameters for current selection.')).toBeInTheDocument()

    const inputNode = screen.getByRole('group', { name: 'I/O Node INPUT' })
    fireEvent.click(inputNode)
    expect(inputNode).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#4ADE80')
    expect(screen.getByTestId('connection-dot-out-0')).toHaveAttribute('data-node-color', '#FB923C')
    expect(screen.getByRole('button', { name: 'Bypass Input' })).toBeDisabled()

    const outputNode = screen.getByRole('group', { name: 'I/O Node OUTPUT' })
    fireEvent.click(outputNode)
    expect(outputNode).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('inspector-node-dot')).toHaveAttribute('data-node-color', '#FB923C')
    expect(screen.getByTestId('connection-dot-in-0')).toHaveAttribute('data-node-color', '#4ADE80')
    expect(screen.getByRole('button', { name: 'Bypass Output' })).toBeDisabled()
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

  test('prevents accidental text selection in properties panel', () => {
    render(<NodeEditorShell />)

    const inspector = screen.getByRole('complementary', { name: 'Properties Panel' })
    expect(inspector).toHaveStyle({ userSelect: 'none' })
  })

  test('prevents accidental text selection in top, left and bottom bars', () => {
    render(<NodeEditorShell />)

    const topBar = screen.getByRole('banner', { name: 'Top Bar' })
    const library = screen.getByRole('navigation', { name: 'Node Library' })
    const statusBar = screen.getByRole('contentinfo', { name: 'Status Bar' })

    expect(topBar).toHaveStyle({ userSelect: 'none' })
    expect(library).toHaveStyle({ userSelect: 'none' })
    expect(statusBar).toHaveStyle({ userSelect: 'none' })
  })

})
