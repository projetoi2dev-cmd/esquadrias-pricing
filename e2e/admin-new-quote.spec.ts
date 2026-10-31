import { expect, test, type Page } from '@playwright/test'
import { hasViewerCredentials, login, waitForApp } from './helpers'

test.skip(!hasViewerCredentials, 'Defina VIEWER_EMAIL e VIEWER_PASS para executar o fluxo admin simulado.')

test.beforeEach(async ({ page }) => {
  await page.route(/\/rest\/v1\/workspace_members\?/, async (route) => {
    const response = await route.fetch()
    const json = await response.json()
    const body = Array.isArray(json)
      ? json.map((row) => ({ ...row, role: 'admin' }))
      : { ...json, role: 'admin' }
    await route.fulfill({
      status: response.status(),
      headers: { ...response.headers(), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  })
})

async function openOrcamentos(page: Page) {
  await login(page)
  await waitForApp(page)
  await page.getByRole('button', { name: 'Orçamentos', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Orçamentos', exact: true })).toBeVisible()
  await expect(page.getByText(/editando orçamento/)).toBeVisible({ timeout: 20_000 })
}

test('admin simulado vê o formulário e o salvar ao criar novo orçamento', async ({ page }) => {
  await openOrcamentos(page)

  await page.getByRole('button', { name: 'Novo Orçamento' }).click()
  await expect(page.getByText(/novo orçamento/).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Novo orçamento iniciado/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar Produtos' })).toBeVisible()
  expect(await page.locator('input:not(:disabled), select:not(:disabled), textarea:not(:disabled)').count()).toBeGreaterThan(0)
})

test('salvar sem itens valida e com item chega ao RPC', async ({ page }) => {
  await openOrcamentos(page)

  await page.getByRole('button', { name: 'Novo Orçamento' }).click()
  const save = page.getByRole('button', { name: 'Salvar', exact: true }).first()
  await save.click()
  await expect(page.getByText('Adicione pelo menos um produto.')).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Adicionar Produtos' }).click()
  const firstProduct = page.locator('.slide-in button').first()
  await expect(firstProduct).toBeVisible({ timeout: 10_000 })
  await firstProduct.click()
  await expect(page.getByText(/1 item ·/).first()).toBeVisible({ timeout: 10_000 })

  await save.click()
  await expect(page.getByText(/Sem permissao para salvar orcamentos neste workspace/)).toBeVisible({ timeout: 15_000 })
})
