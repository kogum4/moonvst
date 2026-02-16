import { describe, expect, test, vi } from 'vitest'

describe('main entry', () => {
  test('renders App into root element', async () => {
    vi.resetModules()

    const render = vi.fn()
    const createRoot = vi.fn(() => ({ render }))

    vi.doMock('react-dom/client', () => ({
      default: { createRoot },
      createRoot,
    }))

    vi.doMock('../../../products/showcase/ui-entry/App', () => ({
      default: () => null,
    }))
    vi.doMock('../../../products/template/ui-entry/App', () => ({
      default: () => null,
    }))

    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'))
    expect(render).toHaveBeenCalled()
  })
})
