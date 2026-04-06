import { Buffer } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { controlForLabel, loginFromLanding } from './helpers/auth';

const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF', 'utf8');

test('admin can upload a cover and publish a document', async ({ page }) => {
  await loginFromLanding(page, 'admin.teste@biblioteca.local', 'Admin@Teste123');

  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/admin/livros');
  await expect(page.getByRole('heading', { name: /Livros e capas do catálogo/i })).toBeVisible();
  await page.getByRole('button', { name: /Novo livro/i }).click();

  const bookForm = page.locator('form').filter({ has: page.getByRole('button', { name: /Cadastrar livro/i }) });

  await controlForLabel(bookForm, 'Número do tombo').fill('BPVII-0901');
  await controlForLabel(bookForm, 'Título').fill('Livro com upload E2E');
  await controlForLabel(bookForm, 'Autor').fill('Equipe de Testes');
  await controlForLabel(bookForm, 'Categoria').fill('Fluxos automatizados');
  await controlForLabel(bookForm, 'Faixa escolar').fill('6º ao 9º ano');
  await controlForLabel(bookForm, 'Quantidade').fill('2');
  await controlForLabel(bookForm, 'Classificação').fill('5');
  await controlForLabel(bookForm, 'Dias de leitura').fill('9');
  await controlForLabel(bookForm, 'Descrição', 'textarea').fill(
    'Livro criado pelo Playwright para validar o fluxo real de upload da capa.',
  );

  await bookForm.locator('input[type="file"]').setInputFiles({
    name: 'capa-e2e.png',
    mimeType: 'image/png',
    buffer: validPngBuffer,
  });

  await expect(page.getByText('capa-e2e.png', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Cadastrar livro/i }).click();

  await expect(page.getByText(/Livro cadastrado com sucesso/i)).toBeVisible();
  await expect(page.getByText(/Livro com upload E2E/i)).toBeVisible();

  await page.goto('/admin/documentos');
  await expect(page.getByRole('heading', { name: /Documentos e materiais/i })).toBeVisible();
  await page.getByRole('button', { name: /Novo documento/i }).click();

  const documentForm = page.locator('form').filter({ has: page.getByRole('button', { name: /Publicar documento/i }) });

  await controlForLabel(documentForm, 'Título').fill('Documento E2E da biblioteca');
  await controlForLabel(documentForm, 'Público', 'select').selectOption('todos');
  await controlForLabel(documentForm, 'Descrição', 'textarea').fill(
    'Documento criado pelo Playwright para validar upload, publicação e leitura pública.',
  );
  await documentForm.locator('input[type="file"]').setInputFiles({
    name: 'documento-e2e.pdf',
    mimeType: 'application/pdf',
    buffer: validPdfBuffer,
  });

  await expect(page.getByText('documento-e2e.pdf', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Publicar documento/i }).click();

  await expect(page.getByText(/Documento publicado com sucesso/i)).toBeVisible();
  await expect(page.getByText(/Documento E2E da biblioteca/i)).toBeVisible();

  await page.goto('/documentos');
  await expect(page.getByRole('heading', { name: /Biblioteca em arquivo vivo/i })).toBeVisible();
  await expect(page.getByText(/Documento E2E da biblioteca/i)).toBeVisible();
});
