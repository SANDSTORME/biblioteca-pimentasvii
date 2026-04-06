import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import { LibraryProvider } from '@/contexts/LibraryContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { setStoredSessionToken } from '@/lib/session';
import AdminAuditPage from '@/pages/admin/AdminAuditPage';
import AdminBooksPage from '@/pages/admin/AdminBooksPage';
import AdminDocumentsPage from '@/pages/admin/AdminDocumentsPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';
import PasswordResetPage from '@/pages/public/PasswordResetPage';
import CatalogPage from '@/pages/shared/CatalogPage';
import DocumentsPage from '@/pages/shared/DocumentsPage';
import StudentLoansPage from '@/pages/student/StudentLoansPage';
import { createBookRequest, getAuditLogsRequest, loginWithCredentials } from '@/services/api';
import { getLastPasswordResetLinkForTests, resetMockApi } from '@/test/mockApiService';

const renderWithProviders = (ui: React.ReactNode, route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <LibraryProvider>
          <AuthProvider>{ui}</AuthProvider>
        </LibraryProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

const getFieldControl = (
  scope: HTMLElement,
  label: string,
  selector = 'input, textarea, select',
): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  const labelNode = Array.from(scope.querySelectorAll('label')).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!labelNode) {
    throw new Error(`Rótulo não encontrado: "${label}".`);
  }

  const field = labelNode.parentElement?.querySelector(selector);

  if (!field) {
    throw new Error(`Campo não encontrado para o rótulo "${label}".`);
  }

  return field as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
};

const signIn = async (email: string, senha: string) => {
  const session = await loginWithCredentials(email, senha);
  setStoredSessionToken(session.token);
  return session;
};

describe('Feature expansion flows', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    resetMockApi();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('allows requesting and completing the password reset flow', async () => {
    renderWithProviders(<PasswordResetPage />, '/redefinir-senha');

    expect(await screen.findByRole('heading', { name: /Receber orientações/i })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/seu\.email@escola\.com/i), {
      target: { value: 'aluna.teste.1@aluno.educacao.sp.gov.br' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar link de redefinição/i }));

    const statusMessage = await screen.findByText(/Se o e-mail estiver cadastrado/i);
    expect(statusMessage).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Abrir link de redefinição neste ambiente/i })).not.toBeInTheDocument();

    const previewUrl = getLastPasswordResetLinkForTests();
    expect(previewUrl).toContain('mock-reset-');

    cleanup();
    renderWithProviders(<PasswordResetPage />, previewUrl || '/redefinir-senha');

    expect(await screen.findByText(/Link válido e pronto para uso/i)).toBeInTheDocument();

    const newPassword = 'NovaSenha@2026';
    const resetForm = screen.getByRole('button', { name: /Salvar nova senha/i }).closest('form');
    expect(resetForm).toBeTruthy();

    fireEvent.change(getFieldControl(resetForm!, 'Nova senha'), { target: { value: newPassword } });
    fireEvent.change(getFieldControl(resetForm!, 'Confirmar nova senha'), { target: { value: newPassword } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar nova senha/i }));

    expect(await screen.findByText(/Senha redefinida com sucesso/i)).toBeInTheDocument();

    await expect(loginWithCredentials('aluna.teste.1@aluno.educacao.sp.gov.br', newPassword)).resolves.toHaveProperty(
      'success',
      true,
    );
  });

  it('creates a book with uploaded cover and exposes the new asset in the admin list', async () => {
    await signIn('admin.teste@biblioteca.local', 'Admin@Teste123');
    const { container } = renderWithProviders(<AdminBooksPage />, '/admin/livros');

    fireEvent.click(screen.getByRole('button', { name: /Novo livro/i }));
    const form = screen.getByRole('button', { name: /Cadastrar livro/i }).closest('form');
    expect(form).toBeTruthy();

    fireEvent.change(getFieldControl(form!, 'Número do tombo'), { target: { value: 'BPVII-0999' } });
    fireEvent.change(getFieldControl(form!, 'Título'), { target: { value: 'Memórias da Biblioteca' } });
    fireEvent.change(getFieldControl(form!, 'Autor'), { target: { value: 'Equipe Pimentas VII' } });
    fireEvent.change(getFieldControl(form!, 'Categoria'), { target: { value: 'Projeto Escolar' } });
    fireEvent.change(getFieldControl(form!, 'Faixa escolar'), { target: { value: '6º ao 9º ano' } });
    fireEvent.change(getFieldControl(form!, 'Quantidade'), { target: { value: '3' } });
    fireEvent.change(getFieldControl(form!, 'Classificação'), { target: { value: '5' } });
    fireEvent.change(getFieldControl(form!, 'Dias de leitura'), { target: { value: '10' } });
    fireEvent.change(getFieldControl(form!, 'Descrição', 'textarea'), {
      target: { value: 'Livro criado para validar o fluxo de upload e exibição administrativa.' },
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['cover'], 'capa-memorias.png', { type: 'image/png' })],
      },
    });

    expect(await screen.findByText(/Capa enviada com sucesso/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cadastrar livro/i }));

    expect(await screen.findByText(/Livro cadastrado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByText(/Memórias da Biblioteca/i)).toBeInTheDocument();

    const image = screen.getByAltText(/Memórias da Biblioteca/i);
    expect(image).toHaveAttribute('src', expect.stringContaining('/api/assets/books/mock-'));
  });

  it('publishes a document with upload and keeps it visible on the public documents hub', async () => {
    await signIn('admin.teste@biblioteca.local', 'Admin@Teste123');
    const { container } = renderWithProviders(<AdminDocumentsPage />, '/admin/documentos');

    fireEvent.click(screen.getByRole('button', { name: /Novo documento/i }));
    const form = screen.getByRole('button', { name: /Publicar documento/i }).closest('form');
    expect(form).toBeTruthy();

    fireEvent.change(getFieldControl(form!, 'Título'), { target: { value: 'Regulamento de leitura 2026' } });
    fireEvent.change(getFieldControl(form!, 'Descrição', 'textarea'), {
      target: { value: 'Arquivo oficial com regras de circulação, devolução e leitura orientada.' },
    });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['pdf-content'], 'regulamento.pdf', { type: 'application/pdf' })],
      },
    });

    expect(await screen.findByText(/Arquivo enviado com sucesso/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Publicar documento/i }));

    expect(await screen.findByText(/Documento publicado com sucesso/i)).toBeInTheDocument();
    expect(screen.getByText(/Regulamento de leitura 2026/i)).toBeInTheDocument();

    cleanup();
    renderWithProviders(<DocumentsPage publicView />, '/documentos');

    expect(await screen.findByRole('heading', { name: /Biblioteca em arquivo vivo/i })).toBeInTheDocument();
    expect(screen.getByText(/Regulamento de leitura 2026/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Baixar documento/i })).toBeInTheDocument();
  });

  it('shows audit entries and supports filtering by action', async () => {
    await signIn('admin.teste@biblioteca.local', 'Admin@Teste123');
    await createBookRequest({
      numeroTombo: 'BPVII-0888',
      titulo: 'Auditoria do Acervo',
      autor: 'Equipe Técnica',
      categoria: 'Processos',
      quantidade: 2,
      classificacao: 4,
      faixaEscolar: 'Ensino Médio',
      diasLeitura: 7,
      descricao: 'Livro criado para validar o painel de auditoria.',
      capa: '/api/assets/books/mock-auditoria.png',
      capaTipo: 'upload',
      capaArquivoNome: 'mock-auditoria.png',
    });

    renderWithProviders(<AdminAuditPage />, '/admin/auditoria');

    expect(await screen.findByText(/Auditoria do Acervo/i)).toBeInTheDocument();

    fireEvent.change(getFieldControl(document.body, 'Ação'), { target: { value: 'livro_criado' } });
    fireEvent.click(screen.getByRole('button', { name: /Filtrar/i }));

    expect(await screen.findByText(/Livro criado/i)).toBeInTheDocument();

    const logs = await getAuditLogsRequest({ acao: 'livro_criado' });
    expect(logs.some((entry) => /Auditoria do Acervo/i.test(entry.descricao))).toBe(true);
  });

  it('renders reports with overdue data for administrative presentations', async () => {
    renderWithProviders(<AdminReportsPage />, '/admin/relatorios');

    expect(await screen.findByRole('heading', { name: /Números prontos para apresentação/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Livros mais emprestados/i })).toBeInTheDocument();
    expect(await screen.findByText(/EMP-2025-0001/i)).toBeInTheDocument();
    expect(screen.getByText(/Atrasos em foco/i)).toBeInTheDocument();
  });

  it('filters and sorts the catalog by search, metadata and ordering rules', async () => {
    renderWithProviders(<CatalogPage basePath="/aluno/catalogo" />, '/aluno/catalogo');

    expect(await screen.findByRole('heading', { name: /Catálogo com filtros inteligentes/i })).toBeInTheDocument();

    fireEvent.change(getFieldControl(document.body, 'Título'), { target: { value: 'Príncipe' } });
    expect(screen.getByText(/O Pequeno Príncipe/i)).toBeInTheDocument();
    expect(screen.queryByText(/Dom Casmurro/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/i }));
    fireEvent.change(getFieldControl(document.body, 'Categoria'), { target: { value: 'Romance Brasileiro' } });
    fireEvent.change(getFieldControl(document.body, 'Faixa escolar'), {
      target: { value: '9º ano e Ensino Médio' },
    });
    fireEvent.change(getFieldControl(document.body, 'Classificação'), { target: { value: '4' } });

    expect(screen.getByText(/Dom Casmurro/i)).toBeInTheDocument();
    expect(screen.queryByText(/O Cortiço/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/i }));
    fireEvent.change(getFieldControl(document.body, 'Ordenação'), { target: { value: 'autor' } });

    await waitFor(() => {
      const cards = screen.getAllByRole('button', { name: /Abrir detalhes do livro/i });
      expect(cards[0]).toHaveAttribute('aria-label', expect.stringContaining('O Cortiço'));
    });

    fireEvent.change(getFieldControl(document.body, 'Ordenação'), { target: { value: 'disponibilidade' } });

    await waitFor(() => {
      const cards = screen.getAllByRole('button', { name: /Abrir detalhes do livro/i });
      expect(cards[0]).toHaveAttribute('aria-label', expect.stringContaining('Meu Pé de Laranja Lima'));
    });
  });

  it('highlights overdue loans for the student experience', async () => {
    await signIn('aluna.teste.1@aluno.educacao.sp.gov.br', 'Aluno@Teste123');
    renderWithProviders(<StudentLoansPage />, '/aluno/emprestimos');

    expect(await screen.findByRole('heading', { name: /Empréstimos do aluno/i })).toBeInTheDocument();
    expect(screen.getByText(/1 atraso\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/dia\(s\) de atraso/i)).toBeInTheDocument();
    expect(screen.getByText(/O Pequeno Príncipe/i)).toBeInTheDocument();
  });

  it('keeps the app shell usable from the compact navigation entry point', async () => {
    await signIn('aluna.teste.1@aluno.educacao.sp.gov.br', 'Aluno@Teste123');
    renderWithProviders(
      <AppLayout>
        <div>Conteúdo interno</div>
      </AppLayout>,
      '/aluno',
    );

    fireEvent.click(screen.getByRole('button', { name: /Abrir menu lateral/i }));

    expect(await screen.findByRole('button', { name: /Fechar menu lateral/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Documentos$/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Conteúdo interno/i)).toBeInTheDocument();
  });
});
