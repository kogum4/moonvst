import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __MOONVST_E2E__?: {
      getRuntimeGraphCalls: () => unknown[]
      getRuntimeGraphSchemaVersions: () => number[]
      getRuntimeGraphLastPayload: () => {
        edges: Array<{ fromIndex: number; toIndex: number }>
        hasOutputPath: number
        nodes: Array<{ effectType: number }>
        schemaVersion: number
      } | null
    }
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const params = [
      { name: 'mix', min: 0, max: 1, defaultValue: 0.5 },
    ]

    const states = new Map()
    const runtimeGraphCalls = []
    const runtimeGraphSchemaVersions = []
    let runtimeGraphLastPayload = null

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
      if (name === 'applyRuntimeGraph') {
        return async (payload) => {
          runtimeGraphCalls.push(payload)
          runtimeGraphSchemaVersions.push(payload?.schemaVersion ?? null)
          runtimeGraphLastPayload = payload
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
    window.__MOONVST_E2E__ = {
      getRuntimeGraphCalls: () => runtimeGraphCalls.slice(),
      getRuntimeGraphSchemaVersions: () => runtimeGraphSchemaVersions.slice(),
      getRuntimeGraphLastPayload: () => runtimeGraphLastPayload,
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

test('showcase runtime: graph edits are applied to runtime payload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Node Library' })).toBeVisible()

  await page.getByRole('button', { name: 'Chorus' }).click()
  await page.getByRole('button', { name: 'Input OUT port' }).click()
  await page.getByRole('button', { name: 'Chorus IN port' }).click()
  await page.getByRole('group', { name: 'Effect Node Chorus' }).click()
  await page.getByRole('slider', { name: 'Mix' }).fill('20')

  const graphState = await page.evaluate(() => {
    return {
      callCount: window.__MOONVST_E2E__?.getRuntimeGraphCalls().length ?? 0,
      lastPayload: window.__MOONVST_E2E__?.getRuntimeGraphLastPayload() ?? null,
      schemaVersions: window.__MOONVST_E2E__?.getRuntimeGraphSchemaVersions() ?? [],
    }
  })

  expect(graphState.callCount).toBeGreaterThan(0)
  expect(graphState.schemaVersions.every((value) => value === 1)).toBe(true)
  expect(graphState.lastPayload).toMatchObject({
    schemaVersion: 1,
    hasOutputPath: 1,
  })
  expect(graphState.lastPayload.nodes.some((node: { effectType: number }) => node.effectType === 1)).toBe(true)
})
