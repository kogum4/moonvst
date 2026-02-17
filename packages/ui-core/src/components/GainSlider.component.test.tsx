import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GainSlider } from './GainSlider'
import { useParam } from '../hooks/useParam'

vi.mock('../hooks/useParam', () => ({
  useParam: vi.fn(),
}))

const mockedUseParam = vi.mocked(useParam)

describe('GainSlider', () => {
  beforeEach(() => {
    mockedUseParam.mockReset()
  })

  test('renders slider and forwards changes', () => {
    const set = vi.fn()

    mockedUseParam.mockReturnValue({
      value: 0.5,
      set,
      info: {
        index: 0,
        name: 'gain',
        min: 0,
        max: 1,
        defaultValue: 0.5,
      },
    })

    render(<GainSlider runtime={{} as never} paramName="gain" />)

    expect(screen.getByText('gain')).toBeInTheDocument()
    expect(screen.getByText('0.50')).toBeInTheDocument()

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '0.75' } })

    expect(set).toHaveBeenCalledWith(0.75)
  })

  test('renders nothing when param info is unavailable', () => {
    mockedUseParam.mockReturnValue({
      value: 0,
      set: vi.fn(),
      info: null,
    })

    const { container } = render(<GainSlider runtime={{} as never} paramName="missing" />)

    expect(container).toBeEmptyDOMElement()
  })
})
