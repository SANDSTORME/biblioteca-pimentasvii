import { expect, test } from '@playwright/test';
import { controlForLabel, loginFromLanding } from './helpers/auth';

test('student can log in and request a new loan from the catalog', async ({ page }) => {
  await loginFromLanding(page, 'aluna.teste.1@aluno.educacao.sp.gov.br', 'Aluno@Teste123');

  await expect(page).toHaveURL(/\/aluno$/);
  await expect(page.getByRole('button', { name: /Explorar cat/i })).toBeVisible();

  await page.getByRole('button', { name: /Explorar cat/i }).click();
  await expect(page).toHaveURL(/\/aluno\/catalogo$/);

  await page.getByRole('button', { name: /Abrir detalhes do livro Viagem ao Centro da Terra/i }).click();
  await expect(page.getByRole('button', { name: /Solicitar empr/i })).toBeVisible();

  await page.getByRole('button', { name: /Solicitar empr/i }).click();

  await expect(page.getByText(/Token gerado com sucesso/i)).toBeVisible();
  await expect(page.getByText(/EMP-\d{4}-\d{6}/)).toBeVisible();
});

test('teacher can log in and create a reading suggestion', async ({ page }) => {
  await loginFromLanding(page, 'professor.teste.1@biblioteca.local', 'Professor@Teste123');

  await expect(page).toHaveURL(/\/professor$/);
  await expect(page.getByRole('button', { name: /Gerenciar sugest/i })).toBeVisible();

  await page.getByRole('button', { name: /Gerenciar sugest/i }).click();
  await expect(page).toHaveURL(/\/professor\/sugestoes$/);

  await page.getByRole('button', { name: /Nova sugest/i }).click();
  const suggestionForm = page.locator('form').filter({ has: page.getByRole('button', { name: /^Enviar$/i }) });
  await controlForLabel(suggestionForm, 'Livro', 'select').selectOption({ index: 1 });
  await suggestionForm.getByRole('combobox').nth(1).selectOption({ index: 1 });
  await suggestionForm.locator('textarea').fill('Leitura sugerida para a semana de producao textual.');
  await page.getByRole('button', { name: /^Enviar$/i }).click();

  await expect(page.getByText(/enviada com sucesso/i)).toBeVisible();
  await expect(page.getByText(/Leitura sugerida para a semana de producao textual\./i)).toBeVisible();
});

test('student can open the history page and see their reading timeline', async ({ page }) => {
  await loginFromLanding(page, 'aluna.teste.1@aluno.educacao.sp.gov.br', 'Aluno@Teste123');

  await expect(page).toHaveURL(/\/aluno$/);
  await page.getByRole('button', { name: /^Hist/i }).click();

  await expect(page).toHaveURL(/\/aluno\/historico$/);
  await expect(page.getByRole('heading', { name: /Histórico do aluno/i })).toBeVisible();
  await expect(page.getByText(/Conta criada na biblioteca/i)).toBeVisible();
  await expect(page.getByText(/Linha do tempo/i)).toBeVisible();
});

test('admin can approve a pending loan from the management panel', async ({ page }) => {
  await loginFromLanding(page, 'admin.teste@biblioteca.local', 'Admin@Teste123');

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(/Pedidos pendentes/i)).toBeVisible();

  await page.goto('/admin/emprestimos');
  await expect(page).toHaveURL(/\/admin\/emprestimos$/);
  await expect(page.getByRole('heading', { name: /Empréstimos com status claro/i })).toBeVisible();
  await page.getByPlaceholder(/Buscar por token/i).fill('EMP-2025-0002');
  await page.getByRole('button', { name: /^pendente$/i }).click();
  await expect(page.getByText(/EMP-2025-0002/i)).toBeVisible();

  const approveButtons = page.getByRole('button', { name: /^Aprovar$/i });
  await expect(approveButtons).toHaveCount(1);
  await approveButtons.first().click();

  await expect(page.getByText(/aprovado com sucesso/i)).toBeVisible();
  await expect(approveButtons).toHaveCount(0);
});
