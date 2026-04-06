import { expect, Locator, Page } from '@playwright/test';

export const waitForInteractiveLanding = async (page: Page) => {
  await expect(page.getByRole('button', { name: /Entrar na plataforma/i })).toBeVisible({ timeout: 10000 });
};

export const controlForLabel = (scope: Page | Locator, label: string, selector = 'input') =>
  scope.locator('label', { hasText: label }).locator('xpath=..').locator(selector).first();

export const loginFromLanding = async (page: Page, email: string, senha: string) => {
  await page.goto('/');
  await waitForInteractiveLanding(page);
  await page.getByRole('button', { name: /Entrar na plataforma/i }).click();
  await controlForLabel(page, 'E-mail').fill(email);
  await controlForLabel(page, 'Senha').fill(senha);
  await page.getByRole('button', { name: /Entrar no sistema/i }).click();
};
