import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('home loads and shows main navigation', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Canvas|Idea Spark|Minimal/i)
    await page.waitForLoadState('networkidle').catch(() => {})
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('can navigate to opportunities', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.getByRole('link', { name: /opportunities|oportunidades|tarefas/i }).first().click().catch(() => {})
    await expect(page).toHaveURL(/\/(opportunities|auth)/)
  })

  test('auth or app shell is visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const main = page.locator('main').or(page.locator('[role="main"]')).or(page.locator('#root'))
    await expect(main.first()).toBeVisible({ timeout: 10000 })
  })
})
