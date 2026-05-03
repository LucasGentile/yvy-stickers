import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

test('stickers page shows auth error without userId in localStorage', async ({ page }) => {
  await page.goto('/stickers')
  await expect(page.getByText('Você precisa se identificar primeiro.')).toBeVisible()
})

test('stickers page shows mode selection when userId is set', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('userId', 'test-user-id'))
  await page.goto('/stickers')
  await expect(page.getByText('Como você quer informar suas figurinhas?')).toBeVisible()
})

test('file upload shows loaded sticker count', async ({ page }) => {
  // Create a temp txt file
  const tmpFile = path.join(os.tmpdir(), 'stickers-test.txt')
  fs.writeFileSync(tmpFile, '1;2;3;4;5')

  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('userId', 'test-user-id'))
  await page.goto('/stickers')

  // Select a mode first
  await page.getByText('Vou informar as figurinhas que').first().click()

  // Upload file
  await page.setInputFiles('input[type="file"]', tmpFile)
  await expect(page.getByText(/5 figurinhas carregadas/)).toBeVisible()

  fs.unlinkSync(tmpFile)
})
