import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Book,
  BookReview,
  FavoriteBook,
  LibraryDocument,
  LibraryNotice,
  Loan,
  ReadingPermission,
  SupportTicket,
  TeacherSuggestion,
  TeacherToken,
  User,
  UserRole,
} from '@/types';
import {
  ApiError,
  LibrarySnapshot,
  approveLoanRequest,
  createBookRequest,
  createDocumentRequest,
  createNoticeRequest,
  createSuggestionRequest,
  createTeacherTokenRequest,
  createTicketRequest,
  createUserRequest,
  deleteBookRequest,
  deleteDocumentRequest,
  getLibrarySnapshot,
  rejectLoanRequest,
  requestLoanRequest,
  returnLoanRequest,
  savePermissionRequest,
  saveReviewRequest,
  toggleFavoriteRequest,
  toggleNoticeHighlightRequest,
  toggleNoticeStatusRequest,
  toggleTeacherTokenRequest,
  toggleUserStatusRequest,
  updateBookRequest,
  updateDocumentRequest,
  updateTicketRequest,
} from '@/services/api';
import { AUTH_CHANGED_EVENT, emitLibraryUpdated } from '@/lib/session';

interface LibraryState {
  books: Book[];
  users: User[];
  loans: Loan[];
  suggestions: TeacherSuggestion[];
  tickets: SupportTicket[];
  teacherTokens: TeacherToken[];
  permissions: ReadingPermission[];
  favorites: FavoriteBook[];
  reviews: BookReview[];
  notices: LibraryNotice[];
  documents: LibraryDocument[];
}

interface RegisterUserInput {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  token?: string;
}

interface CreateUserInput {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  ativo?: boolean;
}

interface SaveBookInput {
  numeroTombo: string;
  titulo: string;
  autor: string;
  categoria: string;
  quantidade: number;
  classificacao: number;
  faixaEscolar: string;
  diasLeitura: number;
  descricao: string;
  capa: string;
  capaTipo?: 'url' | 'upload';
  capaArquivoNome?: string;
}

interface TicketUpdateInput {
  status: SupportTicket['status'];
  resposta?: string;
}

interface SaveReviewInput {
  livroId: string;
  usuarioId: string;
  nota: BookReview['nota'];
  comentario: string;
}

interface CreateNoticeInput {
  titulo: string;
  mensagem: string;
  categoria: LibraryNotice['categoria'];
  publico: LibraryNotice['publico'];
  destaque?: boolean;
  ativo?: boolean;
  criadoPorId?: string;
}

interface SaveDocumentInput {
  titulo: string;
  descricao: string;
  categoria: LibraryDocument['categoria'];
  publico: LibraryDocument['publico'];
  arquivoUrl: string;
  arquivoNome: string;
  arquivoMime: string;
  arquivoTamanho: number;
  ativo?: boolean;
  destaque?: boolean;
}

interface MutationResult {
  success: boolean;
  message: string;
}

interface MutationWithTokenResult extends MutationResult {
  token?: string;
}

interface LibraryContextType extends LibraryState {
  isReady: boolean;
  isLoading: boolean;
  refreshLibrary: () => Promise<void>;
  registerUser: (input: RegisterUserInput) => Promise<{ success: boolean; message: string; user?: User }>;
  createUser: (input: CreateUserInput) => Promise<MutationResult>;
  toggleUserStatus: (userId: string) => Promise<MutationResult>;
  createBook: (input: SaveBookInput) => Promise<MutationResult>;
  updateBook: (bookId: string, input: SaveBookInput) => Promise<MutationResult>;
  deleteBook: (bookId: string) => Promise<MutationResult>;
  requestLoan: (bookId: string, alunoId: string) => Promise<MutationWithTokenResult>;
  approveLoan: (loanId: string) => Promise<MutationResult>;
  rejectLoan: (loanId: string, observacao?: string) => Promise<MutationResult>;
  returnLoan: (loanId: string) => Promise<MutationResult>;
  createSuggestion: (input: Omit<TeacherSuggestion, 'id' | 'criadoEm' | 'professorId'>) => Promise<MutationResult>;
  createTicket: (input: Omit<SupportTicket, 'id' | 'status' | 'criadoEm' | 'resposta' | 'usuarioId'>) => Promise<MutationResult>;
  updateTicket: (ticketId: string, input: TicketUpdateInput) => Promise<MutationResult>;
  createTeacherToken: (descricao: string, turmasPermitidas: string[]) => Promise<MutationWithTokenResult>;
  toggleTeacherToken: (tokenId: string) => Promise<MutationResult>;
  savePermission: (input: Omit<ReadingPermission, 'id' | 'criadoEm' | 'atualizadoEm'>) => Promise<MutationResult>;
  toggleFavorite: (bookId: string, usuarioId: string) => Promise<MutationResult & { isFavorite?: boolean }>;
  saveReview: (input: SaveReviewInput) => Promise<MutationResult>;
  createNotice: (input: CreateNoticeInput) => Promise<MutationResult>;
  toggleNoticeStatus: (noticeId: string) => Promise<MutationResult>;
  toggleNoticeHighlight: (noticeId: string) => Promise<MutationResult>;
  createDocument: (input: SaveDocumentInput) => Promise<MutationResult>;
  updateDocument: (documentId: string, input: SaveDocumentInput) => Promise<MutationResult>;
  deleteDocument: (documentId: string) => Promise<MutationResult>;
  getPermissionForBook: (alunoId: string, livroId: string) => ReadingPermission | undefined;
}

const emptyLibraryState: LibraryState = {
  books: [],
  users: [],
  loans: [],
  suggestions: [],
  tickets: [],
  teacherTokens: [],
  permissions: [],
  favorites: [],
  reviews: [],
  notices: [],
  documents: [],
};

const LibraryContext = createContext<LibraryContextType | null>(null);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const getStateFromSnapshot = (snapshot: LibrarySnapshot): LibraryState => ({
  books: snapshot.books,
  users: snapshot.users,
  loans: snapshot.loans,
  suggestions: snapshot.suggestions,
  tickets: snapshot.tickets,
  teacherTokens: snapshot.teacherTokens,
  permissions: snapshot.permissions,
  favorites: snapshot.favorites,
  reviews: snapshot.reviews,
  notices: snapshot.notices,
  documents: snapshot.documents,
});

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LibraryState>(emptyLibraryState);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  const applySnapshot = useCallback((snapshot: LibrarySnapshot) => {
    setState(getStateFromSnapshot(snapshot));
    emitLibraryUpdated();
  }, []);

  const refreshLibrary = useCallback(async () => {
    setIsLoading(true);
    try {
      const snapshot = await getLibrarySnapshot();
      setState(getStateFromSnapshot(snapshot));
    } catch (error) {
      console.error(error);
      setState((current) => (isReady ? current : emptyLibraryState));
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, [isReady]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    const handleAuthChanged = () => {
      void refreshLibrary();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, [refreshLibrary]);

  const runSnapshotMutation = useCallback(
    async <T extends { success: boolean; message: string; snapshot: LibrarySnapshot }>(
      action: () => Promise<T>,
      fallbackMessage: string,
    ) => {
      try {
        const result = await action();
        applySnapshot(result.snapshot);
        return result;
      } catch (error) {
        return {
          success: false,
          message: getErrorMessage(error, fallbackMessage),
        } as T;
      }
    },
    [applySnapshot],
  );

  const registerUser = useCallback(async (_input: RegisterUserInput) => {
    return {
      success: false,
      message: 'O cadastro público agora é controlado pelo contexto de autenticação.',
    };
  }, []);

  const createUser = useCallback(
    async (input: CreateUserInput) => {
      const result = await runSnapshotMutation(() => createUserRequest(input), 'Não foi possível criar o usuário.');
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const toggleUserStatus = useCallback(
    async (userId: string) => {
      const result = await runSnapshotMutation(
        () => toggleUserStatusRequest(userId),
        'Não foi possível atualizar o usuário.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const createBook = useCallback(
    async (input: SaveBookInput) => {
      const result = await runSnapshotMutation(() => createBookRequest(input), 'Não foi possível cadastrar o livro.');
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const updateBook = useCallback(
    async (bookId: string, input: SaveBookInput) => {
      const result = await runSnapshotMutation(
        () => updateBookRequest(bookId, input),
        'Não foi possível atualizar o livro.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const deleteBook = useCallback(
    async (bookId: string) => {
      const result = await runSnapshotMutation(() => deleteBookRequest(bookId), 'Não foi possível excluir o livro.');
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const requestLoan = useCallback(
    async (bookId: string, alunoId: string) => {
      const result = await runSnapshotMutation(
        () => requestLoanRequest(bookId, alunoId),
        'Não foi possível gerar o empréstimo.',
      );

      return {
        success: result.success,
        message: result.message,
        token: 'token' in result ? result.token : undefined,
      };
    },
    [runSnapshotMutation],
  );

  const approveLoan = useCallback(
    async (loanId: string) => {
      const result = await runSnapshotMutation(
        () => approveLoanRequest(loanId),
        'Não foi possível aprovar o empréstimo.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const rejectLoan = useCallback(
    async (loanId: string, observacao?: string) => {
      const result = await runSnapshotMutation(
        () => rejectLoanRequest(loanId, observacao),
        'Não foi possível recusar o empréstimo.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const returnLoan = useCallback(
    async (loanId: string) => {
      const result = await runSnapshotMutation(
        () => returnLoanRequest(loanId),
        'Não foi possível registrar a devolução.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const createSuggestion = useCallback(
    async (input: Omit<TeacherSuggestion, 'id' | 'criadoEm' | 'professorId'>) => {
      const result = await runSnapshotMutation(
        () => createSuggestionRequest(input),
        'Não foi possível enviar a sugestão.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const createTicket = useCallback(
    async (input: Omit<SupportTicket, 'id' | 'status' | 'criadoEm' | 'resposta' | 'usuarioId'>) => {
      const result = await runSnapshotMutation(() => createTicketRequest(input), 'Não foi possível abrir o chamado.');
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const updateTicket = useCallback(
    async (ticketId: string, input: TicketUpdateInput) => {
      const result = await runSnapshotMutation(
        () => updateTicketRequest(ticketId, input),
        'Não foi possível atualizar o chamado.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const createTeacherToken = useCallback(
    async (descricao: string, turmasPermitidas: string[]) => {
      const result = await runSnapshotMutation(
        () => createTeacherTokenRequest(descricao, turmasPermitidas),
        'Não foi possível gerar o token.',
      );

      return {
        success: result.success,
        message: result.message,
        token: 'token' in result ? result.token : undefined,
      };
    },
    [runSnapshotMutation],
  );

  const toggleTeacherToken = useCallback(
    async (tokenId: string) => {
      const result = await runSnapshotMutation(
        () => toggleTeacherTokenRequest(tokenId),
        'Não foi possível atualizar o token.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const savePermission = useCallback(
    async (input: Omit<ReadingPermission, 'id' | 'criadoEm' | 'atualizadoEm'>) => {
      const result = await runSnapshotMutation(
        () => savePermissionRequest(input),
        'Não foi possível salvar a permissão.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const toggleFavorite = useCallback(
    async (bookId: string, usuarioId: string) => {
      const wasFavorite = state.favorites.some(
        (favorite) => favorite.usuarioId === usuarioId && favorite.livroId === bookId,
      );
      const result = await runSnapshotMutation(
        () => toggleFavoriteRequest(bookId, usuarioId),
        'Não foi possível atualizar a estante pessoal.',
      );

      return {
        success: result.success,
        message: result.message,
        isFavorite: result.success ? !wasFavorite : undefined,
      };
    },
    [runSnapshotMutation, state.favorites],
  );

  const saveReview = useCallback(
    async (input: SaveReviewInput) => {
      const result = await runSnapshotMutation(() => saveReviewRequest(input), 'Não foi possível salvar a resenha.');
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const createNotice = useCallback(
    async (input: CreateNoticeInput) => {
      const result = await runSnapshotMutation(() => createNoticeRequest(input), 'Não foi possível publicar o aviso.');
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const toggleNoticeStatus = useCallback(
    async (noticeId: string) => {
      const result = await runSnapshotMutation(
        () => toggleNoticeStatusRequest(noticeId),
        'Não foi possível atualizar o aviso.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const toggleNoticeHighlight = useCallback(
    async (noticeId: string) => {
      const result = await runSnapshotMutation(
        () => toggleNoticeHighlightRequest(noticeId),
        'Não foi possível atualizar o destaque do aviso.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const createDocument = useCallback(
    async (input: SaveDocumentInput) => {
      const result = await runSnapshotMutation(
        () => createDocumentRequest(input),
        'Não foi possível publicar o documento.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const updateDocument = useCallback(
    async (documentId: string, input: SaveDocumentInput) => {
      const result = await runSnapshotMutation(
        () => updateDocumentRequest(documentId, input),
        'Não foi possível atualizar o documento.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const result = await runSnapshotMutation(
        () => deleteDocumentRequest(documentId),
        'Não foi possível remover o documento.',
      );
      return { success: result.success, message: result.message };
    },
    [runSnapshotMutation],
  );

  const getPermissionForBook = useCallback(
    (alunoId: string, livroId: string) =>
      state.permissions.find((permission) => permission.alunoId === alunoId && permission.livroId === livroId),
    [state.permissions],
  );

  const value = useMemo<LibraryContextType>(
    () => ({
      ...state,
      isReady,
      isLoading,
      refreshLibrary,
      registerUser,
      createUser,
      toggleUserStatus,
      createBook,
      updateBook,
      deleteBook,
      requestLoan,
      approveLoan,
      rejectLoan,
      returnLoan,
      createSuggestion,
      createTicket,
      updateTicket,
      createTeacherToken,
      toggleTeacherToken,
      savePermission,
      toggleFavorite,
      saveReview,
      createNotice,
      toggleNoticeStatus,
      toggleNoticeHighlight,
      createDocument,
      updateDocument,
      deleteDocument,
      getPermissionForBook,
    }),
    [
      approveLoan,
      createBook,
      createDocument,
      createNotice,
      createSuggestion,
      createTeacherToken,
      createTicket,
      createUser,
      deleteBook,
      deleteDocument,
      getPermissionForBook,
      isLoading,
      isReady,
      refreshLibrary,
      registerUser,
      rejectLoan,
      requestLoan,
      returnLoan,
      savePermission,
      saveReview,
      state,
      toggleFavorite,
      toggleNoticeHighlight,
      toggleNoticeStatus,
      toggleTeacherToken,
      toggleUserStatus,
      updateBook,
      updateDocument,
      updateTicket,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary deve ser usado dentro de LibraryProvider');
  }

  return context;
};
