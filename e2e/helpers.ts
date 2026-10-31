import { expect, type Page } from '@playwright/test'

export const viewerEmail = process.env.VIEWER_EMAIL ?? ''
export const viewerPassword = process.env.VIEWER_PASS ?? ''
export const hasViewerCredentials = Boolean(viewerEmail && viewerPassword)

export async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('E-mail').fill(viewerEmail)
  await page.getByLabel('Senha').fill(viewerPassword)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

export async function waitForApp(page: Page) {
  await expect(page.getByRole('button', { name: 'Orçamentos', exact: true })).toBeVisible({ timeout: 30_000 })
}

export async function openPage(page: Page, button: string, heading: string) {
  await page.getByRole('button', { name: button, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible({ timeout: 20_000 })
}
