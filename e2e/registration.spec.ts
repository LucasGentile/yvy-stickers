import { test, expect } from '@playwright/test'

test('registration form is visible on home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Quem é você?')).toBeVisible()
  await expect(page.getByLabel('Nome completo')).toBeVisible()
  await expect(page.getByLabel('Apartamento')).toBeVisible()
  await expect(page.getByLabel('Torre')).toBeVisible()
  await expect(page.getByLabel('WhatsApp (com DDD)')).toBeVisible()
})

test('header shows app name and WhatsApp group button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('YVY Figurinhas')).toBeVisible()
  await expect(page.getByText('Grupo YVY')).toBeVisible()
})

test('WhatsApp group button has correct href', async ({ page }) => {
  await page.goto('/')
  const link = page.getByText('Grupo YVY')
  const href = await link.getAttribute('href')
  expect(href).toContain('chat.whatsapp.com')
})
