import { describe, expect, test } from 'vitest'
import './setup'

describe('test setup', () => {
  test('registers jest-dom matchers', () => {
    const element = document.createElement('div')
    document.body.appendChild(element)

    expect(element).toBeInTheDocument()

    document.body.removeChild(element)
  })
})
