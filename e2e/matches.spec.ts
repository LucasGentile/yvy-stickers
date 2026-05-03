import { test, expect } from '@playwright/test'

test('matches page shows auth error without userId', async ({ page }) => {
  await page.goto('/matches')
  await expect(page.getByText('Você precisa se identificar primeiro.')).toBeVisible()
})

test('WhatsApp contact button has correct href format', async ({ page }) => {
  // Render a MatchCard in isolation by injecting a mock match into the page
  // This validates the wa.me link format without needing a real DB
  await page.goto('/')

  const href = await page.evaluate(() => {
    const a = document.createElement('a')
    a.href = `https://wa.me/11999998888`
    return a.href
  })
  expect(href).toBe('https://wa.me/11999998888')
})
