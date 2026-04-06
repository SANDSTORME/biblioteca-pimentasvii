import { expect, test } from '@playwright/test';

test('landing page shows the Biblioteca Pimentas VII brand and access actions', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Biblioteca Pimentas VII/i);
  await expect(page.getByRole('button', { name: /Entrar na plataforma/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Criar conta/i })).toBeVisible();
  await expect(page.getByText(/Cat[aá]logo vivo/i)).toBeVisible();
  await expect(page.getByText(/Acesso institucional/i).first()).toBeVisible();
  await expect(page.getByText(/Acesso demonstrativo/i)).toHaveCount(0);
  await expect(page.getByText(/admin@escola\.com/i)).toHaveCount(0);
  await expect(page.getByText(/maria@escola\.com/i)).toHaveCount(0);
  await expect(page.getByText(/ricardo@escola\.com/i)).toHaveCount(0);
  await expect(page.getByText(/Token sugerido/i)).toHaveCount(0);
});
