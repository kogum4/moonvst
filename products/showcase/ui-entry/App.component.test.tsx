import { render, screen } from '../../../packages/ui-core/src/test/testing'
import { describe, expect, test } from 'vitest'
import ShowcaseApp from './App'

describe('showcase product app', () => {
  test('renders node editor shell regions', () => {
    render(<ShowcaseApp />)

    expect(screen.getByRole('banner', { name: 'Top Bar' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Node Library' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Graph Canvas' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Properties Panel' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo', { name: 'Status Bar' })).toBeInTheDocument()
  })
})
