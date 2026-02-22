import { render, screen, within } from '../test/testing'
import { describe, expect, test } from 'vitest'
import {
  EffectNode,
  IONode,
  LibItem,
  ParamRow,
  ParamSlider,
  PortIn,
  PortOut,
} from './NodePrimitives'

describe('EffectNode (TLTED)', () => {
  test('renders structure and applies props', () => {
    render(
      <EffectNode
        label="Compressor"
        color="#F97316"
        inCount={2}
        outCount={1}
        bypassed
      />,
    )

    const node = screen.getByRole('group', { name: 'Effect Node Compressor' })
    expect(node).toHaveAttribute('data-pencil-id', 'TLTED')
    expect(node).toHaveAttribute('data-bypassed', 'true')
    expect(within(node).getByText('Compressor')).toBeInTheDocument()
    expect(within(node).getAllByTestId('port-in')).toHaveLength(2)
    expect(within(node).getAllByTestId('port-out')).toHaveLength(1)
  })
})

describe('IONode (3w2LY)', () => {
  test('renders input variant', () => {
    render(<IONode variant="input" />)

    const node = screen.getByRole('group', { name: 'I/O Node INPUT' })
    expect(node).toHaveAttribute('data-pencil-id', '3w2LY')
    expect(node).toHaveAttribute('data-variant', 'input')
    expect(within(node).queryAllByTestId('port-in')).toHaveLength(0)
    expect(within(node).getAllByTestId('port-out')).toHaveLength(1)
  })

  test('renders output variant', () => {
    render(<IONode variant="output" />)

    const node = screen.getByRole('group', { name: 'I/O Node OUTPUT' })
    expect(node).toHaveAttribute('data-variant', 'output')
    expect(within(node).getAllByTestId('port-in')).toHaveLength(1)
    expect(within(node).queryAllByTestId('port-out')).toHaveLength(0)
  })
})

describe('LibItem / ParamSlider / PortIn-Out / ParamRow', () => {
  test('renders LibItem', () => {
    render(<LibItem label="Delay" color="#22D3EE" />)

    const item = screen.getByRole('button', { name: 'Delay' })
    expect(item).toHaveAttribute('data-pencil-id', 'T4R15')
  })

  test('renders ParamSlider with ARIA slider semantics', () => {
    render(<ParamSlider value={64} />)

    const slider = screen.getByRole('slider', { name: 'Parameter value' })
    expect(slider).toHaveAttribute('data-pencil-id', 'UQsji')
    expect(slider).toHaveAttribute('aria-valuenow', '64')
  })

  test('renders PortIn and PortOut', () => {
    const { rerender } = render(<PortIn />)
    expect(screen.getByTestId('port-in')).toHaveAttribute('data-pencil-id', 'zGscn')

    rerender(<PortOut />)
    expect(screen.getByTestId('port-out')).toHaveAttribute('data-pencil-id', 'VLHGQ')
  })

  test('renders ParamRow with label and value text', () => {
    render(<ParamRow label="Mix" valueText="30%" value={30} />)

    const row = screen.getByRole('group', { name: 'Parameter Row Mix' })
    expect(row).toHaveAttribute('data-pencil-id', 'n7CSX')
    expect(within(row).getByText('Mix')).toBeInTheDocument()
    expect(within(row).getByText('30%')).toBeInTheDocument()
  })
})
