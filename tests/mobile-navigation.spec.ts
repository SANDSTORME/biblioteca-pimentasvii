import { expect, test } from '@playwright/test';
import { loginFromLanding } from './helpers/auth';

test('student can use the mobile navigation shell to reach documents', async ({ page }) => {
  await loginFromLanding(page, 'aluna.teste.1@aluno.educacao.sp.gov.br', 'Aluno@Teste123');

  await expect(page).toHaveURL(/\/aluno$/);

  const openMenuButton = page.getByRole('button', { name: /Abrir menu lateral/i });
  await expect(openMenuButton).toBeVisible();
  await openMenuButton.click();

  await expect(page.getByRole('button', { name: /Fechar menu lateral/i })).toBeVisible();
  await page.getByRole('button', { name: /^Documentos$/i }).click();

  await expect(page).toHaveURL(/\/aluno\/documentos$/);
  await expect(page.getByText(/Biblioteca em arquivo vivo/i)).toBeVisible();
});
