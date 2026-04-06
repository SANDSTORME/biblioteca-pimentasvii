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
import { getStoredSessionToken } from '@/lib/session';

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

export interface PasswordResetRequestResult extends ApiActionResult {
  previewUrl?: string;
  expiresInMinutes?: number;
}

export interface ValidateResetTokenResult extends ApiActionResult {
  email?: string;
}

export interface UploadedAsset {
  arquivoNome: string;
  arquivoMime: string;
  arquivoTamanho: number;
  caminhoPublico: string;
}

export interface UploadAssetResult extends ApiActionResult {
  asset: UploadedAsset;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const createHeaders = (initHeaders?: HeadersInit, options?: { isFormData?: boolean }) => {
  const headers = new Headers(initHeaders);
  headers.set('Accept', 'application/json');

  if (!options?.isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getStoredSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
};

const parseResponseBody = async (response: Response) => {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { message: raw };
  }
};

const request = async <T>(path: string, init?: RequestInit & { isFormData?: boolean }): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: createHeaders(init?.headers, { isFormData: init?.isFormData }),
  });

  const payload = await parseResponseBody(response);
  const message =
    payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
      ? payload.message
      : response.ok
        ? 'Operação concluída.'
        : 'Não foi possível concluir a solicitação.';

  if (!response.ok) {
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
};

const postJson = <T>(path: string, body?: unknown, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST') =>
  request<T>(path, {
    method,
    body: body == null ? undefined : JSON.stringify(body),
  });

const postFormData = <T>(path: string, body: FormData) =>
  request<T>(path, {
    method: 'POST',
    body,
    isFormData: true,
  });

export const getLibrarySnapshot = async () => {
  const response = await request<{ success: true; snapshot: LibrarySnapshot }>('/library');
  return response.snapshot;
};

export const getPublicOverview = async () => {
  const response = await request<{ success: true; overview: PublicOverview }>('/public/overview');
  return response.overview;
};

export const getCurrentSession = async () => {
  const response = await request<{ success: true; user: User }>('/auth/me');
  return response.user;
};

export const loginWithCredentials = (email: string, senha: string) =>
  postJson<AuthActionResult>('/auth/login', { email, senha });

export const registerAccount = (input: {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  token?: string;
}) => postJson<AuthActionResult>('/auth/register', input);

export const requestPasswordResetRequest = (email: string) =>
  postJson<PasswordResetRequestResult>('/auth/forgot-password', { email });

export const validatePasswordResetTokenRequest = (token: string) =>
  request<ValidateResetTokenResult>(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`);

export const resetPasswordRequest = (token: string, senha: string) =>
  postJson<ApiActionResult>('/auth/reset-password', { token, senha });

export const logoutSession = () => postJson<ApiActionResult>('/auth/logout');

export const createUserRequest = (input: {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  ativo?: boolean;
}) => postJson<SnapshotActionResult>('/users', input);

export const toggleUserStatusRequest = (userId: string) =>
  postJson<SnapshotActionResult>(`/users/${userId}/toggle-status`, undefined, 'PATCH');

export const uploadBookCoverRequest = async (file: File) => {
  const body = new FormData();
  body.append('capa', file);
  return postFormData<UploadAssetResult>('/uploads/book-cover', body);
};

export const uploadDocumentRequest = async (file: File) => {
  const body = new FormData();
  body.append('arquivo', file);
  return postFormData<UploadAssetResult>('/uploads/document', body);
};

export const createBookRequest = (input: {
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
}) => postJson<SnapshotActionResult>('/books', input);

export const updateBookRequest = (
  bookId: string,
  input: {
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
) => postJson<SnapshotActionResult>(`/books/${bookId}`, input, 'PUT');

export const deleteBookRequest = (bookId: string) =>
  postJson<SnapshotActionResult>(`/books/${bookId}`, undefined, 'DELETE');

export const requestLoanRequest = (bookId: string, alunoId?: string) =>
  postJson<LoanActionResult>('/loans/request', { bookId, alunoId });

export const approveLoanRequest = (loanId: string) =>
  postJson<SnapshotActionResult>(`/loans/${loanId}/approve`);

export const rejectLoanRequest = (loanId: string, observacao?: string) =>
  postJson<SnapshotActionResult>(`/loans/${loanId}/reject`, { observacao });

export const returnLoanRequest = (loanId: string) =>
  postJson<SnapshotActionResult>(`/loans/${loanId}/return`);

export const createSuggestionRequest = (input: { livroId: string; turma: string; mensagem: string }) =>
  postJson<SnapshotActionResult>('/suggestions', input);

export const createTicketRequest = (input: { assunto: string; mensagem: string }) =>
  postJson<SnapshotActionResult>('/tickets', input);

export const updateTicketRequest = (
  ticketId: string,
  input: { status: SupportTicket['status']; resposta?: string },
) => postJson<SnapshotActionResult>(`/tickets/${ticketId}`, input, 'PATCH');

export const createTeacherTokenRequest = (descricao: string, turmasPermitidas: string[]) =>
  postJson<TeacherTokenActionResult>('/teacher-tokens', { descricao, turmasPermitidas });

export const toggleTeacherTokenRequest = (tokenId: string) =>
  postJson<SnapshotActionResult>(`/teacher-tokens/${tokenId}/toggle`, undefined, 'PATCH');

export const savePermissionRequest = (input: {
  alunoId: string;
  livroId: string;
  permitido: boolean;
  observacao?: string;
  criadoPorId?: string;
}) => postJson<SnapshotActionResult>('/permissions', input, 'PUT');

export const toggleFavoriteRequest = (bookId: string, usuarioId?: string) =>
  postJson<SnapshotActionResult>('/favorites/toggle', { bookId, usuarioId });

export const saveReviewRequest = (input: {
  livroId: string;
  usuarioId?: string;
  nota: BookReview['nota'];
  comentario: string;
}) => postJson<SnapshotActionResult>('/reviews', input, 'PUT');

export const createNoticeRequest = (input: {
  titulo: string;
  mensagem: string;
  categoria: LibraryNotice['categoria'];
  publico: LibraryNotice['publico'];
  destaque?: boolean;
  ativo?: boolean;
  criadoPorId?: string;
}) => postJson<SnapshotActionResult>('/notices', input);

export const toggleNoticeStatusRequest = (noticeId: string) =>
  postJson<SnapshotActionResult>(`/notices/${noticeId}/toggle-status`, undefined, 'PATCH');

export const toggleNoticeHighlightRequest = (noticeId: string) =>
  postJson<SnapshotActionResult>(`/notices/${noticeId}/toggle-highlight`, undefined, 'PATCH');

export const createDocumentRequest = (input: {
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
}) => postJson<SnapshotActionResult>('/documents', input);

export const updateDocumentRequest = (
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
) => postJson<SnapshotActionResult>(`/documents/${documentId}`, input, 'PUT');

export const deleteDocumentRequest = (documentId: string) =>
  postJson<SnapshotActionResult>(`/documents/${documentId}`, undefined, 'DELETE');

export const getAdminReportsRequest = async () => {
  const response = await request<{ success: true; reports: LibraryReports }>('/admin/reports');
  return response.reports;
};

export const getAuditLogsRequest = async (filters?: {
  acao?: AuditAction;
  atorId?: string;
  dataInicial?: string;
  dataFinal?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.acao) params.set('acao', filters.acao);
  if (filters?.atorId) params.set('atorId', filters.atorId);
  if (filters?.dataInicial) params.set('dataInicial', filters.dataInicial);
  if (filters?.dataFinal) params.set('dataFinal', filters.dataFinal);

  const response = await request<{ success: true; logs: AuditLog[] }>(`/admin/audit?${params.toString()}`);
  return response.logs;
};
