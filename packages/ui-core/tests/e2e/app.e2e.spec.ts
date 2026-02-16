import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const params = [
      { name: 'gain', min: 0, max: 1, defaultValue: 0.5 },
      { name: 'pre_delay_ms', min: 0, max: 200, defaultValue: 40 },
      { name: 'decay', min: 0.1, max: 10, defaultValue: 1.2 },
      { name: 'damping', min: 0, max: 1, defaultValue: 0.4 },
      { name: 'diffusion', min: 0, max: 1, defaultValue: 0.6 },
      { name: 'mix', min: 0, max: 1, defaultValue: 0.3 },
    ]

    const states = new Map()

    const getSliderState = (name) => {
      const match = /^param_(\d+)$/.exec(name)
      const index = match ? Number(match[1]) : 0
      if (!states.has(index)) {
        let value = params[index]?.defaultValue ?? 0
        const listeners = new Set()
        states.set(index, {
          getValue: () => value,
          setValue: (next) => {
            value = Number(next)
            listeners.forEach((listener) => listener())
          },
          addListener: (listener) => listeners.add(listener),
          removeListener: (listener) => listeners.delete(listener),
        })
      }
      return states.get(index)
    }

    const getNativeFunction = (name) => {
      if (name === 'getParamCount') {
        return async () => params.length
      }
      if (name === 'getParamInfo') {
        return async (index) => ({ ...params[index], index })
      }
      if (name === 'setParam') {
        return async (index, value) => {
          getSliderState(`param_${index}`).setValue(value)
        }
      }
      if (name === 'getLevel') {
        return async () => 0.25
      }
      return async () => 0
    }

    window.__JUCE__ = {
      getNativeFunction,
      getSliderState,
    }
  })
})

test('renders MoonVST controls', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'MoonVST' })).toBeVisible()
  await expect(page.getByText('Runtime: juce')).toBeVisible()
  await expect(page.getByRole('slider')).toHaveCount(1)
})
