import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { NodeEditorShell } from './node_editor/NodeEditorShell'

describe('node editor shell layout', () => {
  test('renders Pencil-mapped regions with semantic roles and region ids', () => {
    render(<NodeEditorShell />)

    expect(screen.getByRole('banner', { name: 'Top Bar' })).toHaveAttribute('data-region-id', 'FMWVd')
    expect(screen.getByRole('navigation', { name: 'Node Library' })).toHaveAttribute('data-region-id', 'XQtg4')
    expect(screen.getByRole('main', { name: 'Graph Canvas' })).toHaveAttribute('data-region-id', 'jJBPL')
    expect(screen.getByRole('complementary', { name: 'Properties Panel' })).toHaveAttribute('data-region-id', 'P0JNl')
    expect(screen.getByRole('contentinfo', { name: 'Status Bar' })).toHaveAttribute('data-region-id', 'gkrb8')
  })
})
