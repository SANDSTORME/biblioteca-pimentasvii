import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LibraryProvider, useLibrary } from '@/contexts/LibraryContext';
import { resetMockApi } from '@/test/mockApiService';
import { SESSION_STORAGE_KEY } from '@/lib/session';

type LibrarySnapshot = ReturnType<typeof useLibrary>;
type AuthSnapshot = ReturnType<typeof useAuth>;

let latestLibrary: LibrarySnapshot | null = null;
let latestAuth: AuthSnapshot | null = null;

const CaptureContexts = () => {
  latestLibrary = useLibrary();
  latestAuth = useAuth();

  return <div data-testid="session-user">{latestAuth.user?.email ?? 'anon'}</div>;
};

const renderHarness = () =>
  render(
    <LibraryProvider>
      <AuthProvider>
        <CaptureContexts />
      </AuthProvider>
    </LibraryProvider>,
  );

const renderHarnessReady = async () => {
  renderHarness();
  await waitFor(() => {
    expect(latestLibrary?.books.length).toBeGreaterThan(0);
  });
};

describe('Library and auth flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetMockApi();
    latestLibrary = null;
    latestAuth = null;
  });

  it('registers a professor with a valid token and starts a session', async () => {
    await renderHarnessReady();

    await act(async () => {
      const result = await latestAuth?.register(
        'Nova Professora',
        'nova.professora@biblioteca.local',
        'Senha@Teste123',
        'professor',
        undefined,
        'PROF-2025-C3D4',
      );

      expect(result?.success).toBe(true);
    });

    expect(latestAuth?.user?.email).toBe('nova.professora@biblioteca.local');
    expect(screen.getByTestId('session-user')).toHaveTextContent('nova.professora@biblioteca.local');
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toContain('mock-token-');
    expect(latestLibrary?.teacherTokens.find((token) => token.token === 'PROF-2025-C3D4')?.usado).toBe(true);
  });

  it('rejects student registration without the institutional domain', async () => {
    await renderHarnessReady();

    await act(async () => {
      const result = await latestAuth?.register('Novo Aluno', 'joao@gmail.com', 'senha123', 'aluno', '8º A');

      expect(result?.success).toBe(false);
      expect(result?.message).toMatch(/aluno\.educacao\.sp\.gov\.br/i);
    });

    expect(latestAuth?.user).toBeNull();
    expect(screen.getByTestId('session-user')).toHaveTextContent('anon');
  });

  it('prevents deactivating the last active administrator', async () => {
    await renderHarnessReady();

    await act(async () => {
      const result = await latestLibrary?.toggleUserStatus('6');
      expect(result?.success).toBe(false);
      expect(result?.message).toMatch(/administrador ativo/i);
    });

    expect(latestLibrary?.users.find((user) => user.id === '6')?.ativo).toBe(true);
  });

  it('logs out the current user when their account is deactivated', async () => {
    await renderHarnessReady();

    await act(async () => {
      const loggedIn = await latestAuth?.login('professor.teste.1@biblioteca.local', 'Professor@Teste123');
      expect(loggedIn).toBe(true);
    });

    const currentUserId = latestAuth?.user?.id;
    expect(currentUserId).toBeTruthy();

    await act(async () => {
      const result = await latestLibrary?.toggleUserStatus(currentUserId!);
      expect(result?.success).toBe(true);
    });

    await waitFor(() => {
      expect(latestAuth?.user).toBeNull();
    });

    expect(screen.getByTestId('session-user')).toHaveTextContent('anon');
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('approves a pending loan and updates inventory', async () => {
    await renderHarnessReady();

    const loanId = '2';
    const targetLoan = latestLibrary?.loans.find((loan) => loan.id === loanId);
    const initialBook = latestLibrary?.books.find((book) => book.id === targetLoan?.livroId);
    const initialAvailable = initialBook?.quantidadeDisponivel ?? 0;

    await act(async () => {
      const result = await latestLibrary?.approveLoan(loanId);
      expect(result?.success).toBe(true);
    });

    await waitFor(() => {
      expect(latestLibrary?.loans.find((loan) => loan.id === loanId)?.status).toBe('aprovado');
    });

    expect(latestLibrary?.books.find((book) => book.id === targetLoan?.livroId)?.quantidadeDisponivel).toBe(
      initialAvailable - 1,
    );
  });

  it('returns an approved loan and restores inventory', async () => {
    await renderHarnessReady();

    const loanId = '1';
    const targetLoan = latestLibrary?.loans.find((loan) => loan.id === loanId);
    const initialBook = latestLibrary?.books.find((book) => book.id === targetLoan?.livroId);
    const initialAvailable = initialBook?.quantidadeDisponivel ?? 0;

    await act(async () => {
      const result = await latestLibrary?.returnLoan(loanId);
      expect(result?.success).toBe(true);
    });

    expect(latestLibrary?.loans.find((loan) => loan.id === loanId)?.status).toBe('devolvido');
    expect(latestLibrary?.books.find((book) => book.id === targetLoan?.livroId)?.quantidadeDisponivel).toBe(
      initialAvailable + 1,
    );
  });

  it('toggles a favorite book for the student shelf', async () => {
    await renderHarnessReady();

    await act(async () => {
      const loggedIn = await latestAuth?.login('aluna.teste.1@aluno.educacao.sp.gov.br', 'Aluno@Teste123');
      expect(loggedIn).toBe(true);
    });

    await act(async () => {
      const result = await latestLibrary?.toggleFavorite('3', latestAuth?.user?.id || '');
      expect(result?.success).toBe(true);
      expect(result?.isFavorite).toBe(true);
    });

    expect(
      latestLibrary?.favorites.some(
        (favorite) => favorite.usuarioId === latestAuth?.user?.id && favorite.livroId === '3',
      ),
    ).toBe(true);
  });

  it('allows publishing a review only after a completed loan', async () => {
    await renderHarnessReady();

    await act(async () => {
      const loggedIn = await latestAuth?.login('aluno.teste.2@aluno.educacao.sp.gov.br', 'Aluno@Teste123');
      expect(loggedIn).toBe(true);
    });

    await act(async () => {
      const result = await latestLibrary?.saveReview({
        livroId: '2',
        usuarioId: latestAuth?.user?.id || '',
        nota: 4,
        comentario: 'Leitura muito boa para discutir memoria, ponto de vista e interpretacao em sala.',
      });
      expect(result?.success).toBe(true);
    });

    expect(latestLibrary?.reviews.some((review) => review.usuarioId === latestAuth?.user?.id && review.livroId === '2')).toBe(true);
  });

  it('creates a new library notice for presentation and dashboards', async () => {
    await renderHarnessReady();

    await act(async () => {
      const result = await latestLibrary?.createNotice({
        titulo: 'Nova rodada de leitura orientada',
        mensagem: 'As turmas do nono ano vao iniciar uma trilha de leitura comentada na proxima semana.',
        categoria: 'evento',
        publico: 'todos',
        destaque: true,
        criadoPorId: '6',
      });
      expect(result?.success).toBe(true);
    });

    expect(latestLibrary?.notices[0]?.titulo).toBe('Nova rodada de leitura orientada');
    expect(latestLibrary?.notices[0]?.destaque).toBe(true);
  });
});
