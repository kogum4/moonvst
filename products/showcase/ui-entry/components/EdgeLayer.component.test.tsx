import { render, screen } from '../../../../packages/ui-core/src/test/testing'
import { describe, expect, test, vi } from 'vitest'
import { EdgeLayer } from './EdgeLayer'
import type { GraphEdge, GraphNode } from '../state/graphTypes'

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  bottom: top + height,
  height,
  left,
  right: left + width,
  toJSON: () => ({}),
  top,
  width,
  x: left,
  y: top,
})

describe('edge layer measurements', () => {
  test('remeasures after mount and draws default edge from actual port buttons', async () => {
    let queryCallCount = 0
    const fromButton = { getBoundingClientRect: () => rect(180, 240, 16, 16) }
    const toButton = { getBoundingClientRect: () => rect(620, 240, 16, 16) }
    const canvas = {
      getBoundingClientRect: () => rect(20, 30, 900, 500),
      querySelector: vi.fn((selector: string) => {
        queryCallCount += 1
        if (queryCallCount <= 2) {
          return null
        }
        if (selector.includes('data-node-id="input"') && selector.includes('data-port-side="out"')) {
          return fromButton
        }
        if (selector.includes('data-node-id="output"') && selector.includes('data-port-side="in"')) {
          return toButton
        }
        return null
      }),
      scrollLeft: 0,
      scrollTop: 0,
    }

    const nodes: GraphNode[] = [
      { bypass: false, id: 'input', kind: 'input', params: {}, x: 120, y: 180 },
      { bypass: false, id: 'output', kind: 'output', params: {}, x: 760, y: 180 },
    ]
    const edges: GraphEdge[] = [{ fromNodeId: 'input', id: 'edge-input-output', toNodeId: 'output' }]

    render(
      <EdgeLayer
        canvasRef={{ current: canvas as unknown as HTMLElement }}
        edges={edges}
        nodes={nodes}
        onDisconnect={() => {}}
      />,
    )

    const expectedPath = 'M 168 218 C 388 218 388 218 608 218'

    expect(screen.getByLabelText('Wire Input -> Output')).toHaveAttribute('d', expectedPath)
  })
})
