import { mockBooks } from '@/data/mock-books';
import { mockFavorites, mockNotices, mockReviews } from '@/data/mock-community';
import { mockLoans, mockSuggestions, mockTeacherTokens, mockTickets } from '@/data/mock-loans';
import { mockUsers } from '@/data/mock-users';
import { coerceSchoolClass, normalizeSchoolClassList } from '@/lib/schoolClasses';
import {
  AuditAction,
  AuditLog,
  Book,
  BookReview,
  FavoriteBook,
  LibraryDocument,
  LibraryNotice,
  LibraryReports,
  Loan,
  ReadingPermission,
  SupportTicket,
  TeacherSuggestion,
  TeacherToken,
  User,
  UserRole,
} from '@/types';

export interface LibrarySnapshot {
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

export interface PublicOverview {
  totalBooks: number;
  availableCopies: number;
  activeLoans: number;
  suggestionsCount: number;
  totalUsers: number;
  activeNotices: number;
  featuredNotices: LibraryNotice[];
}

export interface ApiActionResult {
  success: boolean;
  message: string;
}

export interface SnapshotActionResult extends ApiActionResult {
  snapshot: LibrarySnapshot;
}

export interface LoanActionResult extends SnapshotActionResult {
  token?: string;
}

export interface TeacherTokenActionResult extends SnapshotActionResult {
  token?: string;
}

export interface AuthActionResult extends ApiActionResult {
  user: User;
  token: string;
}

export interface UploadedAsset {
  arquivoNome: string;
  arquivoMime: string;
  arquivoTamanho: number;
  caminhoPublico: string;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status = 400, payload: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type LibraryState = LibrarySnapshot;

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const diffDays = (fromDate: string, toDate: string) =>
  Math.max(
    0,
    Math.round((new Date(`${toDate}T12:00:00`).getTime() - new Date(`${fromDate}T12:00:00`).getTime()) / 86400000),
  );
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const STUDENT_EMAIL_DOMAIN = '@aluno.educacao.sp.gov.br';
const isValidStudentInstitutionalEmail = (email: string) =>
  normalizeEmail(email).endsWith(STUDENT_EMAIL_DOMAIN) && normalizeEmail(email) !== STUDENT_EMAIL_DOMAIN;
const sanitizeMultilineText = (value: string) =>
  value
    .trim()
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

const clone = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const decorateLoan = (loan: Loan): Loan => {
  if (loan.status === 'aprovado' && loan.dataDevolucaoPrevista && loan.dataDevolucaoPrevista < today() && !loan.dataDevolucao) {
    return {
      ...loan,
      status: 'atrasado',
      statusBase: 'aprovado',
      estaAtrasado: true,
      diasAtraso: diffDays(loan.dataDevolucaoPrevista, today()),
    };
  }

  return {
    ...loan,
    statusBase: loan.status === 'atrasado' ? 'aprovado' : loan.status,
    estaAtrasado: loan.status === 'atrasado',
    diasAtraso: loan.status === 'atrasado' ? loan.diasAtraso ?? 0 : 0,
  };
};

const createInitialState = (): LibraryState => ({
  books: clone(mockBooks),
  users: clone(mockUsers),
  loans: clone(mockLoans),
  suggestions: clone(mockSuggestions),
  tickets: clone(mockTickets),
  teacherTokens: clone(mockTeacherTokens),
  permissions: [
    {
      id: 'perm-1',
      alunoId: '1',
      livroId: '2',
      permitido: true,
      observacao: 'Leitura aprovada para reforco de literatura brasileira.',
      criadoEm: '2025-03-01',
      atualizadoEm: '2025-03-01',
      criadoPorId: '6',
    },
  ],
  favorites: clone(mockFavorites),
  reviews: clone(mockReviews),
  notices: clone(mockNotices),
  documents: [],
});

let state: LibraryState = createInitialState();
let sessionUserId: string | null = null;
let auditLogs: AuditLog[] = [];
let passwordResetPreviewUrl = '';

const buildSnapshot = (): LibrarySnapshot => ({
  ...clone(state),
  loans: clone(state.loans).map(decorateLoan),
});

export const resetMockApi = () => {
  state = createInitialState();
  sessionUserId = null;
  auditLogs = [];
  passwordResetPreviewUrl = '';
};

export const getLastPasswordResetLinkForTests = () => passwordResetPreviewUrl;

const getSessionUser = () => {
  if (!sessionUserId) {
    throw new ApiError('Sessao invalida ou expirada.', 401);
  }

  const user = state.users.find((entry) => entry.id === sessionUserId && entry.ativo);
  if (!user) {
    sessionUserId = null;
    throw new ApiError('Sessao invalida ou expirada.', 401);
  }

  return clone(user);
};

const signIn = (user: User): AuthActionResult => {
  sessionUserId = user.id;
  return {
    success: true,
    message: 'Sessao iniciada com sucesso.',
    user: clone(user),
    token: `mock-token-${user.id}`,
  };
};

const pushAudit = (acao: AuditAction, descricao: string, alvoTipo: AuditLog['alvoTipo'], alvoId?: string) => {
  const actor = sessionUserId ? state.users.find((entry) => entry.id === sessionUserId) : null;
  auditLogs = [
    {
      id: createId('audit'),
      acao,
      categoria:
        acao.startsWith('livro')
          ? 'acervo'
          : acao.startsWith('usuario')
            ? 'usuarios'
            : acao.startsWith('emprestimo')
              ? 'emprestimos'
              : acao.startsWith('documento')
                ? 'documentos'
                : acao.startsWith('token')
                  ? 'tokens'
                  : acao.startsWith('aviso')
                    ? 'avisos'
                    : acao.startsWith('permissao')
                      ? 'permissoes'
                      : 'seguranca',
      descricao,
      atorId: actor?.id,
      atorNome: actor?.nome,
      atorRole: actor?.role,
      alvoTipo,
      alvoId,
      criadoEm: new Date().toISOString(),
    },
    ...auditLogs,
  ];
};

export const getLibrarySnapshot = async () => buildSnapshot();

export const getPublicOverview = async (): Promise<PublicOverview> => ({
  totalBooks: state.books.length,
  availableCopies: state.books.reduce((total, book) => total + book.quantidadeDisponivel, 0),
  activeLoans: state.loans.filter((loan) => loan.status === 'aprovado').length,
  suggestionsCount: state.suggestions.length,
  totalUsers: state.users.filter((user) => user.ativo).length,
  activeNotices: state.notices.filter((notice) => notice.ativo).length,
  featuredNotices: clone(state.notices.filter((notice) => notice.ativo && notice.destaque).slice(0, 3)),
});

export const getCurrentSession = async () => getSessionUser();

export const loginWithCredentials = async (email: string, senha: string) => {
  const user = state.users.find(
    (entry) => normalizeEmail(entry.email) === normalizeEmail(email) && entry.ativo && (entry.senha || '') === senha,
  );
  if (!user) {
    throw new ApiError('E-mail ou senha invalidos.', 401);
  }

  user.ultimoAcesso = today();
  return signIn(user);
};

export const registerAccount = async (input: {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  token?: string;
}) => {
  const email = normalizeEmail(input.email);
  const turma = input.role === 'aluno' ? coerceSchoolClass(input.turma) : null;
  if (state.users.some((user) => normalizeEmail(user.email) === email)) {
    throw new ApiError('Ja existe um usuario com este e-mail.', 400);
  }

  if (input.role === 'aluno' && !turma) {
    throw new ApiError('Selecione uma turma valida para o aluno.', 400);
  }

  if (input.role === 'aluno' && !isValidStudentInstitutionalEmail(email)) {
    throw new ApiError('O aluno deve usar um Gmail institucional terminado em @aluno.educacao.sp.gov.br.', 400);
  }

  let selectedToken: TeacherToken | undefined;
  if (input.role === 'professor') {
    selectedToken = state.teacherTokens.find(
      (token) => normalizeEmail(token.token) === normalizeEmail(input.token || ''),
    );

    if (!selectedToken) {
      throw new ApiError('Token de professor invalido.', 400);
    }

    if (selectedToken.usado) {
      throw new ApiError('Este token ja foi utilizado.', 400);
    }
  }

  const user: User = {
    id: createId('user'),
    nome: input.nome.trim(),
    email,
    senha: input.senha,
    role: input.role,
    ativo: true,
    turma: turma || undefined,
    tokenProfessorId: selectedToken?.id,
    criadoEm: today(),
    ultimoAcesso: today(),
  };

  state.users = [user, ...state.users];
  if (selectedToken) {
    state.teacherTokens = state.teacherTokens.map((token) =>
      token.id === selectedToken?.id ? { ...token, usado: true, usadoPorId: user.id } : token,
    );
    pushAudit('token_professor_utilizado', `Token de professor utilizado por ${user.nome}.`, 'token_professor', selectedToken.id);
  }

  return signIn(user);
};

export const requestPasswordResetRequest = async (email: string) => {
  passwordResetPreviewUrl = `/redefinir-senha?token=mock-reset-${normalizeEmail(email)}`;
  return {
    success: true,
    message: 'Se o e-mail estiver cadastrado, enviaremos as orientações para redefinir a senha.',
  };
};

export const validatePasswordResetTokenRequest = async (token: string) => {
  if (!token.startsWith('mock-reset-')) {
    throw new ApiError('Este link expirou ou já foi utilizado.', 400);
  }

  return {
    success: true,
    message: 'Token válido.',
    email: token.replace('mock-reset-', ''),
  };
};

export const resetPasswordRequest = async (token: string, senha: string) => {
  const email = token.replace('mock-reset-', '');
  const user = state.users.find((entry) => normalizeEmail(entry.email) === normalizeEmail(email));
  if (!user) {
    throw new ApiError('Usuário não encontrado para redefinição.', 404);
  }

  user.senha = senha;
  pushAudit('senha_redefinida', `Senha redefinida para ${user.nome}.`, 'seguranca', user.id);
  return { success: true, message: 'Senha redefinida com sucesso. Faça login com a nova senha.' };
};

export const logoutSession = async () => {
  sessionUserId = null;
  return { success: true, message: 'Sessao encerrada.' };
};

export const createUserRequest = async (input: {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  ativo?: boolean;
}): Promise<SnapshotActionResult> => {
  const turma = input.role === 'aluno' ? coerceSchoolClass(input.turma) : null;
  if (state.users.some((user) => normalizeEmail(user.email) === normalizeEmail(input.email))) {
    throw new ApiError('Ja existe um usuario com este e-mail.', 400);
  }

  if (input.role === 'aluno' && !turma) {
    throw new ApiError('Selecione uma turma valida para o aluno.', 400);
  }

  const user: User = {
    id: createId('user'),
    nome: input.nome.trim(),
    email: normalizeEmail(input.email),
    senha: input.senha,
    role: input.role,
    ativo: input.ativo ?? true,
    turma: turma || undefined,
    criadoEm: today(),
  };

  state.users = [user, ...state.users];
  pushAudit('usuario_criado', `Usuário ${user.nome} criado no ambiente de teste.`, 'usuario', user.id);
  return { success: true, message: 'Usuario criado com sucesso.', snapshot: buildSnapshot() };
};

export const toggleUserStatusRequest = async (userId: string): Promise<SnapshotActionResult> => {
  const target = state.users.find((user) => user.id === userId);
  if (!target) {
    throw new ApiError('Usuario nao encontrado.', 404);
  }

  const activeAdmins = state.users.filter((user) => user.role === 'admin' && user.ativo).length;
  if (target.role === 'admin' && target.ativo && activeAdmins <= 1) {
    throw new ApiError('Mantenha pelo menos um administrador ativo no sistema.', 400);
  }

  state.users = state.users.map((user) => (user.id === userId ? { ...user, ativo: !user.ativo } : user));
  pushAudit('usuario_alterado', `Status do usuário ${target.nome} atualizado.`, 'usuario', userId);
  return {
    success: true,
    message: target.ativo ? 'Usuario desativado com sucesso.' : 'Usuario reativado com sucesso.',
    snapshot: buildSnapshot(),
  };
};

export const createBookRequest = async (_input: {
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
}): Promise<SnapshotActionResult> => {
  const book: Book = {
    id: createId('book'),
    numeroTombo: _input.numeroTombo,
    titulo: _input.titulo,
    autor: _input.autor,
    categoria: _input.categoria,
    quantidade: _input.quantidade,
    quantidadeDisponivel: _input.quantidade,
    classificacao: _input.classificacao,
    faixaEscolar: _input.faixaEscolar,
    diasLeitura: _input.diasLeitura,
    descricao: _input.descricao,
    capa: _input.capa,
    capaTipo: _input.capaTipo,
    capaArquivoNome: _input.capaArquivoNome,
  };

  state.books = [book, ...state.books];
  pushAudit('livro_criado', `Livro ${book.titulo} cadastrado no acervo.`, 'livro', book.id);
  return { success: true, message: 'Livro cadastrado com sucesso.', snapshot: buildSnapshot() };
};

export const updateBookRequest = async (
  bookId: string,
  _input: {
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
  },
): Promise<SnapshotActionResult> => {
  state.books = state.books.map((book) =>
    book.id === bookId
      ? {
          ...book,
          numeroTombo: _input.numeroTombo,
          titulo: _input.titulo,
          autor: _input.autor,
          categoria: _input.categoria,
          quantidade: _input.quantidade,
          quantidadeDisponivel: Math.min(book.quantidadeDisponivel, _input.quantidade),
          classificacao: _input.classificacao,
          faixaEscolar: _input.faixaEscolar,
          diasLeitura: _input.diasLeitura,
          descricao: _input.descricao,
          capa: _input.capa,
          capaTipo: _input.capaTipo,
          capaArquivoNome: _input.capaArquivoNome,
        }
      : book,
  );
  pushAudit('livro_editado', 'Livro atualizado.', 'livro', bookId);
  return { success: true, message: 'Livro atualizado com sucesso.', snapshot: buildSnapshot() };
};

export const deleteBookRequest = async (bookId: string): Promise<SnapshotActionResult> => {
  state.books = state.books.filter((book) => book.id !== bookId);
  pushAudit('livro_excluido', 'Livro removido do acervo.', 'livro', bookId);
  return { success: true, message: 'Livro removido do acervo.', snapshot: buildSnapshot() };
};

export const uploadBookCoverRequest = async (file: File) => ({
  success: true,
  message: 'Capa enviada com sucesso.',
  asset: {
    arquivoNome: file.name,
    arquivoMime: file.type || 'image/jpeg',
    arquivoTamanho: file.size || 1024,
    caminhoPublico: `/api/assets/books/mock-${Date.now()}-${file.name}`,
  },
});

export const uploadDocumentRequest = async (file: File) => ({
  success: true,
  message: 'Arquivo enviado com sucesso.',
  asset: {
    arquivoNome: file.name,
    arquivoMime: file.type || 'application/pdf',
    arquivoTamanho: file.size || 1024,
    caminhoPublico: `/api/assets/documents/mock-${Date.now()}-${file.name}`,
  },
});

export const requestLoanRequest = async (bookId: string, alunoId?: string): Promise<LoanActionResult> => {
  const studentId = alunoId || getSessionUser().id;
  const book = state.books.find((entry) => entry.id === bookId);
  if (!book) {
    throw new ApiError('Livro nao encontrado.', 404);
  }

  if (book.quantidadeDisponivel <= 0) {
    throw new ApiError('Este livro esta indisponivel no momento.', 400);
  }

  const blocked = state.permissions.find(
    (permission) => permission.alunoId === studentId && permission.livroId === bookId && !permission.permitido,
  );
  if (blocked) {
    throw new ApiError(blocked.observacao || 'A leitura deste livro esta bloqueada para este aluno.', 400);
  }

  const alreadyOpen = state.loans.some(
    (loan) => loan.alunoId === studentId && loan.livroId === bookId && ['pendente', 'aprovado'].includes(loan.status),
  );
  if (alreadyOpen) {
    throw new ApiError('Ja existe um emprestimo em aberto para este livro.', 400);
  }

  const activeLoans = state.loans.filter(
    (loan) => loan.alunoId === studentId && ['pendente', 'aprovado'].includes(loan.status),
  ).length;
  if (activeLoans >= 3) {
    throw new ApiError('O aluno ja atingiu o limite de 3 emprestimos simultaneos.', 400);
  }

  const sameYear = state.loans.filter((loan) => loan.token.startsWith(`EMP-${new Date().getFullYear()}-`)).length + 1;
  const token = `EMP-${new Date().getFullYear()}-${String(sameYear).padStart(4, '0')}`;

  state.loans = [
    {
      id: createId('loan'),
      livroId: bookId,
      alunoId: studentId,
      token,
      status: 'pendente',
      dataPedido: today(),
    },
    ...state.loans,
  ];

  return {
    success: true,
    message: 'Token gerado com sucesso. Aguarde a aprovacao da biblioteca.',
    token,
    snapshot: buildSnapshot(),
  };
};

export const approveLoanRequest = async (loanId: string): Promise<SnapshotActionResult> => {
  const loan = state.loans.find((entry) => entry.id === loanId);
  if (!loan) {
    throw new ApiError('Emprestimo nao encontrado.', 404);
  }

  if (loan.status !== 'pendente') {
    throw new ApiError('Apenas emprestimos pendentes podem ser aprovados.', 400);
  }

  const book = state.books.find((entry) => entry.id === loan.livroId);
  if (!book || book.quantidadeDisponivel <= 0) {
    throw new ApiError('Nao ha exemplares disponiveis para aprovacao.', 400);
  }

  state.loans = state.loans.map((entry) =>
    entry.id === loanId
      ? {
          ...entry,
          status: 'aprovado',
          dataDevolucaoPrevista: addDays(today(), book.diasLeitura),
          observacao: undefined,
        }
      : entry,
  );
  state.books = state.books.map((entry) =>
    entry.id === book.id ? { ...entry, quantidadeDisponivel: entry.quantidadeDisponivel - 1 } : entry,
  );
  pushAudit('emprestimo_aprovado', `Empréstimo ${loan.token} aprovado.`, 'emprestimo', loanId);

  return { success: true, message: 'Emprestimo aprovado com sucesso.', snapshot: buildSnapshot() };
};

export const rejectLoanRequest = async (loanId: string, observacao?: string): Promise<SnapshotActionResult> => {
  const loan = state.loans.find((entry) => entry.id === loanId);
  if (!loan) {
    throw new ApiError('Emprestimo nao encontrado.', 404);
  }

  state.loans = state.loans.map((entry) =>
    entry.id === loanId
      ? {
          ...entry,
          status: 'recusado',
          observacao: observacao?.trim() || 'Solicitacao recusada pela administracao.',
        }
      : entry,
  );
  pushAudit('emprestimo_recusado', `Empréstimo ${loan.token} recusado.`, 'emprestimo', loanId);

  return { success: true, message: 'Emprestimo recusado.', snapshot: buildSnapshot() };
};

export const returnLoanRequest = async (loanId: string): Promise<SnapshotActionResult> => {
  const loan = state.loans.find((entry) => entry.id === loanId);
  if (!loan) {
    throw new ApiError('Emprestimo nao encontrado.', 404);
  }

  if (loan.status !== 'aprovado') {
    throw new ApiError('Apenas emprestimos aprovados podem ser devolvidos.', 400);
  }

  state.loans = state.loans.map((entry) =>
    entry.id === loanId
      ? {
          ...entry,
          status: 'devolvido',
          dataDevolucao: today(),
        }
      : entry,
  );
  state.books = state.books.map((entry) =>
    entry.id === loan.livroId ? { ...entry, quantidadeDisponivel: entry.quantidadeDisponivel + 1 } : entry,
  );
  pushAudit('emprestimo_devolvido', `Devolução registrada para o empréstimo ${loan.token}.`, 'emprestimo', loanId);

  return { success: true, message: 'Devolucao registrada com sucesso.', snapshot: buildSnapshot() };
};

export const createSuggestionRequest = async (input: {
  livroId: string;
  turma: string;
  mensagem: string;
}): Promise<SnapshotActionResult> => {
  const teacher = getSessionUser();
  const turma = coerceSchoolClass(input.turma);
  if (!turma) {
    throw new ApiError('Selecione uma turma valida para a sugestao.', 400);
  }
  state.suggestions = [
    {
      id: createId('suggestion'),
      professorId: teacher.id,
      livroId: input.livroId,
      turma,
      mensagem: input.mensagem,
      criadoEm: today(),
    },
    ...state.suggestions,
  ];

  return { success: true, message: 'Sugestao enviada com sucesso.', snapshot: buildSnapshot() };
};

export const createTicketRequest = async (_input: { assunto: string; mensagem: string }) => {
  throw new ApiError('Nao implementado no mock de teste.', 501);
};

export const updateTicketRequest = async (
  _ticketId: string,
  _input: { status: SupportTicket['status']; resposta?: string },
) => {
  throw new ApiError('Nao implementado no mock de teste.', 501);
};

export const createTeacherTokenRequest = async (descricao: string, turmasPermitidas: string[]): Promise<TeacherTokenActionResult> => {
  const normalizedTurmas = normalizeSchoolClassList(turmasPermitidas);
  if (!descricao.trim() || normalizedTurmas.length === 0 || normalizedTurmas.length !== new Set(turmasPermitidas.map((turma) => turma.trim()).filter(Boolean)).size) {
    throw new ApiError('Informe descricao e apenas turmas validas para o token.', 400);
  }

  const token = `PROF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const tokenId = createId('teacher-token');
  state.teacherTokens = [
    {
      id: tokenId,
      token,
      descricao: descricao.trim(),
      turmasPermitidas: normalizedTurmas,
      usado: false,
      criadoEm: today(),
    },
    ...state.teacherTokens,
  ];
  pushAudit('token_professor_gerado', `Token ${token} gerado para cadastro docente.`, 'token_professor', tokenId);

  return { success: true, message: 'Token criado com sucesso.', token, snapshot: buildSnapshot() };
};

export const toggleTeacherTokenRequest = async (tokenId: string): Promise<SnapshotActionResult> => {
  state.teacherTokens = state.teacherTokens.map((token) =>
    token.id === tokenId && !token.usadoPorId ? { ...token, usado: !token.usado } : token,
  );

  return { success: true, message: 'Token atualizado com sucesso.', snapshot: buildSnapshot() };
};

export const savePermissionRequest = async (input: {
  alunoId: string;
  livroId: string;
  permitido: boolean;
  observacao?: string;
  criadoPorId?: string;
}): Promise<SnapshotActionResult> => {
  const existing = state.permissions.find(
    (permission) => permission.alunoId === input.alunoId && permission.livroId === input.livroId,
  );
  const permissionId = existing?.id ?? createId('permission');

  if (existing) {
    state.permissions = state.permissions.map((permission) =>
      permission.id === existing.id
        ? {
            ...permission,
            permitido: input.permitido,
            observacao: input.observacao,
            atualizadoEm: today(),
            criadoPorId: input.criadoPorId,
          }
        : permission,
    );
  } else {
    state.permissions = [
      {
        id: permissionId,
        alunoId: input.alunoId,
        livroId: input.livroId,
        permitido: input.permitido,
        observacao: input.observacao,
        criadoEm: today(),
        atualizadoEm: today(),
        criadoPorId: input.criadoPorId,
      },
      ...state.permissions,
    ];
  }

  pushAudit(
    'permissao_alterada',
    `Permissão de leitura ${input.permitido ? 'liberada' : 'bloqueada'} para o aluno ${input.alunoId}.`,
    'permissao',
    permissionId,
  );
  return {
    success: true,
    message: existing ? 'Permissao atualizada com sucesso.' : 'Permissao registrada com sucesso.',
    snapshot: buildSnapshot(),
  };
};

export const toggleFavoriteRequest = async (bookId: string, usuarioId?: string): Promise<SnapshotActionResult> => {
  const userId = usuarioId || getSessionUser().id;
  const existing = state.favorites.find((favorite) => favorite.livroId === bookId && favorite.usuarioId === userId);

  if (existing) {
    state.favorites = state.favorites.filter((favorite) => favorite.id !== existing.id);
    return { success: true, message: 'Livro removido dos favoritos.', snapshot: buildSnapshot() };
  }

  state.favorites = [
    { id: createId('favorite'), livroId: bookId, usuarioId: userId, criadoEm: today() },
    ...state.favorites,
  ];
  return { success: true, message: 'Livro salvo na sua estante de favoritos.', snapshot: buildSnapshot() };
};

export const saveReviewRequest = async (input: {
  livroId: string;
  usuarioId?: string;
  nota: BookReview['nota'];
  comentario: string;
}): Promise<SnapshotActionResult> => {
  const userId = input.usuarioId || getSessionUser().id;
  const hasCompletedLoan = state.loans.some(
    (loan) => loan.alunoId === userId && loan.livroId === input.livroId && loan.status === 'devolvido',
  );
  if (!hasCompletedLoan) {
    throw new ApiError('A resenha fica disponivel depois que o aluno concluir a leitura e devolver o livro.', 400);
  }

  const comentario = sanitizeMultilineText(input.comentario);
  if (comentario.length < 16) {
    throw new ApiError('Escreva uma resenha com pelo menos 16 caracteres.', 400);
  }

  const existing = state.reviews.find((review) => review.livroId === input.livroId && review.usuarioId === userId);
  if (existing) {
    state.reviews = state.reviews.map((review) =>
      review.id === existing.id ? { ...review, nota: input.nota, comentario, atualizadoEm: today() } : review,
    );
    return { success: true, message: 'Resenha atualizada com sucesso.', snapshot: buildSnapshot() };
  }

  state.reviews = [
    {
      id: createId('review'),
      livroId: input.livroId,
      usuarioId: userId,
      nota: input.nota,
      comentario,
      criadoEm: today(),
    },
    ...state.reviews,
  ];
  return { success: true, message: 'Resenha publicada com sucesso.', snapshot: buildSnapshot() };
};

export const createNoticeRequest = async (input: {
  titulo: string;
  mensagem: string;
  categoria: LibraryNotice['categoria'];
  publico: LibraryNotice['publico'];
  destaque?: boolean;
  ativo?: boolean;
  criadoPorId?: string;
}): Promise<SnapshotActionResult> => {
  const noticeId = createId('notice');
  state.notices = [
    {
      id: noticeId,
      titulo: input.titulo.trim(),
      mensagem: sanitizeMultilineText(input.mensagem),
      categoria: input.categoria,
      publico: input.publico,
      destaque: input.destaque ?? false,
      ativo: input.ativo ?? true,
      criadoEm: today(),
      criadoPorId: input.criadoPorId,
    },
    ...state.notices,
  ];
  pushAudit('aviso_criado', `Aviso ${input.titulo.trim()} publicado.`, 'aviso', noticeId);

  return { success: true, message: 'Aviso publicado com sucesso.', snapshot: buildSnapshot() };
};

export const toggleNoticeStatusRequest = async (noticeId: string): Promise<SnapshotActionResult> => {
  state.notices = state.notices.map((notice) =>
    notice.id === noticeId ? { ...notice, ativo: !notice.ativo } : notice,
  );
  return { success: true, message: 'Aviso atualizado com sucesso.', snapshot: buildSnapshot() };
};

export const toggleNoticeHighlightRequest = async (noticeId: string): Promise<SnapshotActionResult> => {
  state.notices = state.notices.map((notice) =>
    notice.id === noticeId ? { ...notice, destaque: !notice.destaque } : notice,
  );
  return { success: true, message: 'Aviso atualizado com sucesso.', snapshot: buildSnapshot() };
};

export const createDocumentRequest = async (input: {
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
}): Promise<SnapshotActionResult> => {
  const document: LibraryDocument = {
    id: createId('document'),
    titulo: input.titulo,
    descricao: input.descricao,
    categoria: input.categoria,
    publico: input.publico,
    arquivoUrl: input.arquivoUrl,
    arquivoNome: input.arquivoNome,
    arquivoMime: input.arquivoMime,
    arquivoTamanho: input.arquivoTamanho,
    ativo: input.ativo ?? true,
    destaque: input.destaque ?? false,
    criadoEm: today(),
    atualizadoEm: today(),
  };

  state.documents = [document, ...state.documents];
  pushAudit('documento_criado', `Documento ${document.titulo} publicado.`, 'documento', document.id);
  return { success: true, message: 'Documento publicado com sucesso.', snapshot: buildSnapshot() };
};

export const updateDocumentRequest = async (
  documentId: string,
  input: {
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
  },
): Promise<SnapshotActionResult> => {
  state.documents = state.documents.map((document) =>
    document.id === documentId
      ? {
          ...document,
          ...input,
          ativo: input.ativo ?? true,
          destaque: input.destaque ?? false,
          atualizadoEm: today(),
        }
      : document,
  );
  pushAudit('documento_editado', 'Documento atualizado.', 'documento', documentId);
  return { success: true, message: 'Documento atualizado com sucesso.', snapshot: buildSnapshot() };
};

export const deleteDocumentRequest = async (documentId: string): Promise<SnapshotActionResult> => {
  state.documents = state.documents.filter((document) => document.id !== documentId);
  pushAudit('documento_excluido', 'Documento removido com sucesso.', 'documento', documentId);
  return { success: true, message: 'Documento removido com sucesso.', snapshot: buildSnapshot() };
};

export const getAdminReportsRequest = async (): Promise<LibraryReports> => {
  const loans = state.loans.map(decorateLoan);

  return {
    geradoEm: new Date().toISOString(),
    resumo: {
      livrosCadastrados: state.books.length,
      exemplaresDisponiveis: state.books.reduce((sum, book) => sum + book.quantidadeDisponivel, 0),
      emprestimosAtivos: loans.filter((loan) => loan.status === 'aprovado').length,
      emprestimosAtrasados: loans.filter((loan) => loan.status === 'atrasado').length,
      emprestimosDevolvidos: loans.filter((loan) => loan.status === 'devolvido').length,
      livrosIndisponiveis: state.books.filter((book) => book.quantidadeDisponivel === 0).length,
      alunosAtivos: state.users.filter((user) => user.role === 'aluno' && user.ativo).length,
      professoresAtivos: state.users.filter((user) => user.role === 'professor' && user.ativo).length,
      mediaAvaliacoes: state.reviews.length
        ? state.reviews.reduce((sum, review) => sum + review.nota, 0) / state.reviews.length
        : 0,
    },
    livrosMaisEmprestados: state.books.slice(0, 5).map((book, index) => ({
      livroId: book.id,
      titulo: book.titulo,
      autor: book.autor,
      categoria: book.categoria,
      totalEmprestimos: Math.max(1, 5 - index),
      quantidadeDisponivel: book.quantidadeDisponivel,
      quantidadeTotal: book.quantidade,
      mediaAvaliacoes: book.classificacao,
    })),
    alunosMaisAtivos: state.users
      .filter((user) => user.role === 'aluno')
      .slice(0, 5)
      .map((user, index) => ({
        alunoId: user.id,
        nome: user.nome,
        turma: user.turma,
        totalEmprestimos: Math.max(1, 5 - index),
        totalDevolvidos: Math.max(0, 4 - index),
        atrasosAtuais: index === 0 ? 1 : 0,
      })),
    emprestimosEmAndamento: loans
      .filter((loan) => loan.status === 'aprovado' || loan.status === 'atrasado')
      .map((loan) => ({
        emprestimoId: loan.id,
        token: loan.token,
        status: loan.status,
        alunoNome: state.users.find((user) => user.id === loan.alunoId)?.nome || 'Aluno',
        alunoTurma: state.users.find((user) => user.id === loan.alunoId)?.turma,
        livroTitulo: state.books.find((book) => book.id === loan.livroId)?.titulo || 'Livro',
        dataPedido: loan.dataPedido,
        dataDevolucaoPrevista: loan.dataDevolucaoPrevista,
        dataDevolucao: loan.dataDevolucao,
        diasAtraso: loan.diasAtraso,
      })),
    emprestimosDevolvidos: loans
      .filter((loan) => loan.status === 'devolvido')
      .map((loan) => ({
        emprestimoId: loan.id,
        token: loan.token,
        status: loan.status,
        alunoNome: state.users.find((user) => user.id === loan.alunoId)?.nome || 'Aluno',
        alunoTurma: state.users.find((user) => user.id === loan.alunoId)?.turma,
        livroTitulo: state.books.find((book) => book.id === loan.livroId)?.titulo || 'Livro',
        dataPedido: loan.dataPedido,
        dataDevolucaoPrevista: loan.dataDevolucaoPrevista,
        dataDevolucao: loan.dataDevolucao,
        diasAtraso: loan.diasAtraso,
      })),
    livrosIndisponiveis: state.books
      .filter((book) => book.quantidadeDisponivel === 0)
      .map((book) => ({
        livroId: book.id,
        titulo: book.titulo,
        autor: book.autor,
        categoria: book.categoria,
        totalEmprestimos: 1,
        quantidadeDisponivel: book.quantidadeDisponivel,
        quantidadeTotal: book.quantidade,
        mediaAvaliacoes: book.classificacao,
      })),
    atrasos: loans
      .filter((loan) => loan.status === 'atrasado')
      .map((loan) => ({
        emprestimoId: loan.id,
        token: loan.token,
        status: loan.status,
        alunoNome: state.users.find((user) => user.id === loan.alunoId)?.nome || 'Aluno',
        alunoTurma: state.users.find((user) => user.id === loan.alunoId)?.turma,
        livroTitulo: state.books.find((book) => book.id === loan.livroId)?.titulo || 'Livro',
        dataPedido: loan.dataPedido,
        dataDevolucaoPrevista: loan.dataDevolucaoPrevista,
        dataDevolucao: loan.dataDevolucao,
        diasAtraso: loan.diasAtraso,
      })),
  };
};

export const getAuditLogsRequest = async (filters?: {
  acao?: AuditAction;
  atorId?: string;
  dataInicial?: string;
  dataFinal?: string;
}) =>
  auditLogs.filter((entry) => {
    if (filters?.acao && entry.acao !== filters.acao) return false;
    if (filters?.atorId && entry.atorId !== filters.atorId) return false;
    if (filters?.dataInicial && entry.criadoEm.slice(0, 10) < filters.dataInicial) return false;
    if (filters?.dataFinal && entry.criadoEm.slice(0, 10) > filters.dataFinal) return false;
    return true;
  });
