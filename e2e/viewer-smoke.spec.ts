import { expect, test } from '@playwright/test'
import { hasViewerCredentials, login, openPage, waitForApp } from './helpers'

test.skip(!hasViewerCredentials, 'Defina VIEWER_EMAIL e VIEWER_PASS para executar o smoke do visualizador.')

test('visualizador permanece somente leitura em todos os módulos', async ({ page }) => {
  await login(page)
  await waitForApp(page)
  await expect(page.getByText('Modo somente leitura.')).toBeVisible()

  await openPage(page, 'Orçamentos', 'Orçamentos')
  await expect(page.getByRole('button', { name: 'Novo Orçamento' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aprovar e criar projeto' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Adicionar Produtos' })).toHaveCount(0)

  const disabledFields = page.locator('input:disabled, select:disabled, textarea:disabled')
  await expect(disabledFields.first()).toBeVisible({ timeout: 20_000 })
  expect(await disabledFields.count()).toBeGreaterThan(0)

  const quoteButton = page.locator('button').filter({ hasText: /^ORC-\d/ }).first()
  await expect(quoteButton).toBeVisible({ timeout: 20_000 })
  await quoteButton.click()
  await expect(page.getByText(/visualizando orçamento/)).toBeVisible({ timeout: 20_000 })
  expect(await disabledFields.count()).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aprovar e criar projeto' })).toHaveCount(0)

  await openPage(page, 'Materiais / BOM', 'Banco de Materiais')
  await expect(page.getByRole('button', { name: 'Novo Material' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar material' })).toHaveCount(0)

  await openPage(page, 'Projetos', 'Gestão de Projetos')
  await expect(page.getByRole('button', { name: 'Novo Projeto' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nova Instalação' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Agendar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar projeto' })).toHaveCount(0)

  await openPage(page, 'Equipe', 'Equipe de Instalação')
  await expect(page.getByRole('button', { name: 'Novo Instalador' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar instalador' })).toHaveCount(0)

  await openPage(page, 'Financeiro', 'Fluxo de Caixa')
  await expect(page.getByRole('button', { name: 'Novo Lançamento' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Novo', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar lançamento' })).toHaveCount(0)

  await openPage(page, 'Clientes', 'Clientes')
  await expect(page.getByRole('button', { name: 'Novo Cliente' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar cliente' })).toHaveCount(0)

  await openPage(page, 'Configurações', 'Configurações')
  const workspaceSave = page.getByRole('button', { name: 'Salvar', exact: true })
  await expect(workspaceSave).toHaveCount(1)
  await expect(workspaceSave).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Salvar perfil' })).toBeEnabled()
  await expect(page.getByText('Modo somente leitura.')).toBeVisible()
})
