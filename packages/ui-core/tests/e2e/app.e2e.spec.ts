import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __MOONVST_E2E__?: {
      getSetParamCalls: () => Array<{ index: number; value: number }>
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const setParamCalls: Array<{ index: number; value: number }> = []

    const getNativeFunction = (name: string) => {
      if (name === 'getParamCount') {
        return async () => 315
      }
      if (name === 'getParamInfo') {
        return async (index: number) => ({
          name: index < 6 ? ['gain', 'pre_delay_ms', 'decay', 'damping', 'diffusion', 'mix'][index] : `graph_param_${index}`,
          min: -128,
          max: 128,
          defaultValue: 0,
          index,
        })
      }
      if (name === 'setParam') {
        return async (index: number, value: number) => {
          setParamCalls.push({ index, value: Number(value) })
        }
      }
      if (name === 'getLevel') {
        return async () => 0.25
      }
      return async () => 0
    }

    window.__JUCE__ = { getNativeFunction }
    window.__MOONVST_E2E__ = {
      getSetParamCalls: () => setParamCalls.slice(),
    }
  })
})

test('showcase flow: add -> connect -> edit param -> remove', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Node Library' })).toBeVisible()

  await expect(page.getByRole('group', { name: 'Effect Node Chorus' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Chorus' }).click()
  await expect(page.getByRole('group', { name: 'Effect Node Chorus' })).toBeVisible()

  await page.getByRole('button', { name: 'Input OUT port' }).click()
  await page.getByRole('button', { name: 'Chorus IN port' }).click()
  await expect(page.getByLabel('Wire Input -> Chorus')).toBeVisible()

  await page.getByRole('group', { name: 'Effect Node Chorus' }).click()
  const mixSlider = page.getByRole('slider', { name: 'Mix' })
  await expect(mixSlider).toBeVisible()
  await mixSlider.fill('78')
  await expect(mixSlider).toHaveValue('78')

  await page.getByRole('group', { name: 'Effect Node Chorus' }).click()
  await page.keyboard.press('Delete')
  await expect(page.getByRole('group', { name: 'Effect Node Chorus' })).toHaveCount(0)
  await expect(page.getByLabel('Wire Input -> Chorus')).toHaveCount(0)
})

test('showcase runtime: graph edits are emitted as param bank writes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Node Library' })).toBeVisible()

  await page.getByRole('button', { name: 'Chorus' }).click()
  await page.getByRole('button', { name: 'Input OUT port' }).click()
  await page.getByRole('button', { name: 'Chorus IN port' }).click()
  await page.getByRole('group', { name: 'Effect Node Chorus' }).click()
  await page.getByRole('slider', { name: 'Mix' }).fill('20')

  const state = await page.evaluate(() => {
    const calls = window.__MOONVST_E2E__?.getSetParamCalls() ?? []
    return {
      callCount: calls.length,
      wroteRevision: calls.some((entry) => entry.index === 314),
      wroteGraphHeader: calls.some((entry) => entry.index === 6),
      wroteNodeBank: calls.some((entry) => entry.index >= 10 && entry.index < 186),
    }
  })

  expect(state.callCount).toBeGreaterThan(0)
  expect(state.wroteRevision).toBe(true)
  expect(state.wroteGraphHeader).toBe(true)
  expect(state.wroteNodeBank).toBe(true)
})
