import bcrypt from 'bcryptjs';
import {
  BookReview,
  FavoriteBook,
  LibraryDocument,
  LibraryNotice,
  Loan,
  ReadingPermission,
  SupportTicket,
  TeacherSuggestion,
  User,
  UserRole,
} from '../src/types';
import { coerceSchoolClass, normalizeSchoolClassList } from '../src/lib/schoolClasses';
import { registerAuditLog } from './audit';
import {
  LibrarySnapshot,
  QueryExecutor,
  addDays,
  createId,
  execute,
  generateLoanToken,
  generateTeacherToken,
  getLibrarySnapshot,
  isValidStudentInstitutionalEmail,
  normalizeEmail,
  queryOne,
  readActiveUsers,
  readBookById,
  readBookByTombo,
  readBooks,
  readDocumentById,
  readFavorites,
  readFavoritesByUser,
  readLoanById,
  readLoans,
  readLoansByStudent,
  readOpenLoanByStudentAndBook,
  readPermissionByKey,
  readPermissionsByStudent,
  readReviews,
  readSuggestionsByProfessor,
  readTeacherTokenById,
  readTicketsByUser,
  readUserByEmail,
  readUserById,
  readVisibleDocuments,
  readVisibleNotices,
  sanitizeMultilineText,
  serializeBook,
  serializeDocument,
  serializeFavorite,
  serializeLoan,
  serializeNotice,
  serializePermission,
  serializeReview,
  serializeSuggestion,
  serializeTicket,
  serializeTeacherToken,
  serializeUser,
  today,
  withTransaction,
} from './db';
import { deleteManagedAsset, isManagedAsset } from './storage';

export interface CreateUserInput {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  turma?: string;
  ativo?: boolean;
}

export interface SaveBookInput {
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

export interface TicketUpdateInput {
  status: SupportTicket['status'];
  resposta?: string;
}

export interface SaveReviewInput {
  livroId: string;
  usuarioId?: string;
  nota: BookReview['nota'];
  comentario: string;
}

export interface CreateNoticeInput {
  titulo: string;
  mensagem: string;
  categoria: LibraryNotice['categoria'];
  publico: LibraryNotice['publico'];
  destaque?: boolean;
  ativo?: boolean;
  criadoPorId?: string;
}

export interface SaveDocumentInput {
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

export interface ActionResult {
  success: boolean;
  message: string;
  snapshot: LibrarySnapshot;
}

export interface LoanActionResult extends ActionResult {
  token?: string;
}

export interface TeacherTokenActionResult extends ActionResult {
  token?: string;
}

const isUniqueConstraintError = (error: unknown, fragment: string) => {
  if (!(error instanceof Error) || !('code' in error)) {
    return false;
  }

  const postgresError = error as { code?: string; constraint?: string; message: string };
  return (
    postgresError.code === '23505' &&
    (postgresError.constraint === fragment || postgresError.message.includes(fragment))
  );
};

class DomainError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ensureActor = (actor: User | null | undefined) => {
  if (!actor) {
    throw new DomainError(401, 'Faca login para continuar.');
  }

  return actor;
};

const assertRole = (actor: User | null | undefined, allowedRoles: UserRole[]) => {
  const resolvedActor = ensureActor(actor);
  if (!allowedRoles.includes(resolvedActor.role)) {
    throw new DomainError(403, 'Voce nao tem permissao para executar esta acao.');
  }

  return resolvedActor;
};

const anonymizeLoans = (loans: Loan[]) =>
  loans.map((loan) => ({
    ...loan,
    alunoId: 'publico',
  }));

const anonymizeFavorites = (favorites: FavoriteBook[]) =>
  favorites.map((favorite) => ({
    ...favorite,
    usuarioId: 'publico',
  }));

const anonymizeReviews = (reviews: BookReview[]) =>
  reviews.map((review) => ({
    ...review,
    usuarioId: 'publico',
  }));

const countRows = async (sql: string, values: unknown[] = [], executor?: QueryExecutor) =>
  (await queryOne<{ total: number }>(sql, values, executor))?.total ?? 0;

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const isUploadedAssetPath = (value: string) => value.startsWith('/api/assets/');

const getSnapshotForUserId = async (userId?: string | null) => {
  if (!userId) {
    return getLibrarySnapshotForUser(null);
  }

  const row = await readUserById(userId);
  if (!row || !row.ativo) {
    return getLibrarySnapshotForUser(null);
  }

  return getLibrarySnapshotForUser(serializeUser(row));
};

const normalizeBookInput = (input: SaveBookInput) => {
  const normalized: SaveBookInput = {
    numeroTombo: input.numeroTombo.trim(),
    titulo: input.titulo.trim(),
    autor: input.autor.trim(),
    categoria: input.categoria.trim(),
    quantidade: Number(input.quantidade),
    classificacao: Number(input.classificacao),
    faixaEscolar: input.faixaEscolar.trim(),
    diasLeitura: Number(input.diasLeitura),
    descricao: sanitizeMultilineText(input.descricao),
    capa: input.capa.trim(),
    capaTipo: input.capaTipo === 'upload' ? 'upload' : 'url',
    capaArquivoNome: input.capaArquivoNome?.trim() || undefined,
  };

  if (
    !normalized.numeroTombo ||
    !normalized.titulo ||
    !normalized.autor ||
    !normalized.categoria ||
    !normalized.faixaEscolar ||
    !normalized.descricao ||
    !normalized.capa
  ) {
    throw new DomainError(400, 'Preencha todos os dados obrigatorios do livro.');
  }

  if (!Number.isFinite(normalized.quantidade) || normalized.quantidade < 1) {
    throw new DomainError(400, 'Informe uma quantidade valida para o acervo.');
  }

  if (!Number.isFinite(normalized.classificacao) || normalized.classificacao < 1 || normalized.classificacao > 5) {
    throw new DomainError(400, 'A classificacao deve ficar entre 1 e 5.');
  }

  if (!Number.isFinite(normalized.diasLeitura) || normalized.diasLeitura < 1) {
    throw new DomainError(400, 'Informe um prazo valido de leitura.');
  }

  if (normalized.capaTipo === 'upload' && !isUploadedAssetPath(normalized.capa)) {
    throw new DomainError(400, 'Envie uma capa válida antes de salvar o livro.');
  }

  if (normalized.capaTipo === 'url' && !isHttpUrl(normalized.capa) && !isUploadedAssetPath(normalized.capa)) {
    throw new DomainError(400, 'Informe uma URL válida para a capa do livro.');
  }

  return normalized;
};

const normalizeDocumentInput = (input: SaveDocumentInput) => {
  const normalized = {
    titulo: input.titulo.trim(),
    descricao: sanitizeMultilineText(input.descricao),
    categoria: input.categoria,
    publico: input.publico,
    arquivoUrl: input.arquivoUrl.trim(),
    arquivoNome: input.arquivoNome.trim(),
    arquivoMime: input.arquivoMime.trim(),
    arquivoTamanho: Number(input.arquivoTamanho),
    ativo: input.ativo !== false,
    destaque: Boolean(input.destaque),
  };

  if (
    !normalized.titulo ||
    !normalized.descricao ||
    !normalized.arquivoUrl ||
    !normalized.arquivoNome ||
    !normalized.arquivoMime
  ) {
    throw new DomainError(400, 'Preencha todos os dados obrigatórios do documento.');
  }

  if (!isUploadedAssetPath(normalized.arquivoUrl)) {
    throw new DomainError(400, 'Envie um arquivo válido antes de salvar o documento.');
  }

  if (!Number.isFinite(normalized.arquivoTamanho) || normalized.arquivoTamanho <= 0) {
    throw new DomainError(400, 'O tamanho do documento é inválido.');
  }

  return normalized;
};

export const getLibrarySnapshotForUser = async (actor: User | null | undefined): Promise<LibrarySnapshot> => {
  const [books, reviews] = await Promise.all([readBooks(), readReviews()]);
  const serializedBooks = books.map(serializeBook);
  const serializedReviews = reviews.map(serializeReview);

  if (!actor) {
    const [loans, favorites, notices, documents] = await Promise.all([
      readLoans(),
      readFavorites(),
      readVisibleNotices(null),
      readVisibleDocuments(null),
    ]);

    return {
      books: serializedBooks,
      users: [],
      loans: anonymizeLoans(loans.map(serializeLoan)),
      suggestions: [],
      tickets: [],
      teacherTokens: [],
      permissions: [],
      favorites: anonymizeFavorites(favorites.map(serializeFavorite)),
      reviews: anonymizeReviews(serializedReviews),
      notices: notices.map(serializeNotice),
      documents: documents.map(serializeDocument),
    };
  }

  if (actor.role === 'admin') {
    return getLibrarySnapshot();
  }

  if (actor.role === 'professor') {
    const [users, suggestions, tickets, notices, documents, teacherToken] = await Promise.all([
      readActiveUsers(),
      readSuggestionsByProfessor(actor.id),
      readTicketsByUser(actor.id),
      readVisibleNotices(actor.role),
      readVisibleDocuments(actor.role),
      actor.tokenProfessorId ? readTeacherTokenById(actor.tokenProfessorId) : Promise.resolve(undefined),
    ]);

    return {
      books: serializedBooks,
      users: users.map(serializeUser),
      loans: [],
      suggestions: suggestions.map(serializeSuggestion),
      tickets: tickets.map(serializeTicket),
      teacherTokens: teacherToken ? [serializeTeacherToken(teacherToken)] : [],
      permissions: [],
      favorites: [],
      reviews: serializedReviews,
      notices: notices.map(serializeNotice),
      documents: documents.map(serializeDocument),
    };
  }

  const [users, loans, tickets, permissions, favorites, notices, documents] = await Promise.all([
    readActiveUsers(),
    readLoansByStudent(actor.id),
    readTicketsByUser(actor.id),
    readPermissionsByStudent(actor.id),
    readFavoritesByUser(actor.id),
    readVisibleNotices(actor.role),
    readVisibleDocuments(actor.role),
  ]);

  return {
    books: serializedBooks,
    users: users.map(serializeUser),
    loans: loans.map(serializeLoan),
    suggestions: [],
    tickets: tickets.map(serializeTicket),
    teacherTokens: [],
    permissions: permissions.map(serializePermission),
    favorites: favorites.map(serializeFavorite),
    reviews: serializedReviews,
    notices: notices.map(serializeNotice),
    documents: documents.map(serializeDocument),
  };
};

export const createUser = async (actor: User | null | undefined, input: CreateUserInput): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const email = normalizeEmail(input.email);
  const turma = input.role === 'aluno' ? coerceSchoolClass(input.turma) : null;

  if (await readUserByEmail(email)) {
    throw new DomainError(400, 'Ja existe um usuario com este e-mail.');
  }

  if (input.role === 'aluno' && !turma) {
    throw new DomainError(400, 'Selecione uma turma valida para o aluno.');
  }

  if (input.role === 'aluno' && !isValidStudentInstitutionalEmail(email)) {
    throw new DomainError(400, 'Alunos devem usar o e-mail institucional @aluno.educacao.sp.gov.br.');
  }

  const userId = createId('user');
  const createdAt = today();

  await execute(
    `INSERT INTO users (id, nome, email, role, ativo, senha_hash, turma, token_professor_id, ultimo_acesso, criado_em, email_confirmado, email_confirmado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, $8, TRUE, $9)`,
    [userId, input.nome.trim(), email, input.role, input.ativo === false ? false : true, bcrypt.hashSync(input.senha, 10), turma, createdAt, createdAt],
  );

  await registerAuditLog({
    acao: 'usuario_criado',
    categoria: 'usuarios',
    descricao: `Usuário ${input.nome.trim()} criado pela administração.`,
    ator: admin,
    alvoTipo: 'usuario',
    alvoId: userId,
    detalhes: {
      email,
      role: input.role,
      turma: turma ?? null,
      ativo: input.ativo !== false,
    },
  });

  return {
    success: true,
    message: 'Usuário criado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const toggleUserStatus = async (actor: User | null | undefined, userId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const target = await readUserById(userId);

  if (!target) {
    throw new DomainError(404, 'Usuario nao encontrado.');
  }

  const activeAdmins = await countRows("SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND ativo = TRUE");
  if (target.role === 'admin' && target.ativo && activeAdmins <= 1) {
    throw new DomainError(400, 'Mantenha pelo menos um administrador ativo no sistema.');
  }

  await execute('UPDATE users SET ativo = $1 WHERE id = $2', [!target.ativo, target.id]);
  await registerAuditLog({
    acao: 'usuario_alterado',
    categoria: 'usuarios',
    descricao: `${target.ativo ? 'Desativação' : 'Reativação'} do usuário ${target.nome}.`,
    ator: admin,
    alvoTipo: 'usuario',
    alvoId: target.id,
    detalhes: {
      ativoAntes: Boolean(target.ativo),
      ativoDepois: !target.ativo,
    },
  });

  return {
    success: true,
    message: target.ativo ? 'Usuário desativado com sucesso.' : 'Usuário reativado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const createBook = async (actor: User | null | undefined, input: SaveBookInput): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const normalized = normalizeBookInput(input);
  const existingTombo = await readBookByTombo(normalized.numeroTombo);
  const bookId = createId('book');

  if (existingTombo) {
    throw new DomainError(400, 'Ja existe um livro cadastrado com este numero de tombo.');
  }

  await execute(
    `INSERT INTO books (id, numero_tombo, titulo, autor, categoria, quantidade, quantidade_disponivel, classificacao, faixa_escolar, dias_leitura, descricao, capa, capa_tipo, capa_arquivo_nome)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      bookId,
      normalized.numeroTombo,
      normalized.titulo,
      normalized.autor,
      normalized.categoria,
      normalized.quantidade,
      normalized.quantidade,
      normalized.classificacao,
      normalized.faixaEscolar,
      normalized.diasLeitura,
      normalized.descricao,
      normalized.capa,
      normalized.capaTipo ?? 'url',
      normalized.capaArquivoNome ?? null,
    ],
  );

  await registerAuditLog({
    acao: 'livro_criado',
    categoria: 'acervo',
    descricao: `Livro ${normalized.titulo} cadastrado no acervo.`,
    ator: admin,
    alvoTipo: 'livro',
    alvoId: bookId,
    detalhes: {
      numeroTombo: normalized.numeroTombo,
      categoria: normalized.categoria,
      quantidade: normalized.quantidade,
      capaTipo: normalized.capaTipo ?? 'url',
    },
  });

  return {
    success: true,
    message: 'Livro cadastrado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const updateBook = async (
  actor: User | null | undefined,
  bookId: string,
  input: SaveBookInput,
): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const normalized = normalizeBookInput(input);
  const existing = await readBookById(bookId);

  if (!existing) {
    throw new DomainError(404, 'Livro nao encontrado.');
  }

  const borrowedCopies = existing.quantidade - existing.quantidade_disponivel;
  const existingTombo = await readBookByTombo(normalized.numeroTombo);

  if (existingTombo && existingTombo.id !== bookId) {
    throw new DomainError(400, 'Ja existe um livro cadastrado com este numero de tombo.');
  }

  if (normalized.quantidade < borrowedCopies) {
    throw new DomainError(400, 'A quantidade total não pode ser menor que os empréstimos em andamento.');
  }

  const previousCover = existing.capa;
  await execute(
    `UPDATE books
       SET numero_tombo = $1, titulo = $2, autor = $3, categoria = $4, quantidade = $5, quantidade_disponivel = $6,
           classificacao = $7, faixa_escolar = $8, dias_leitura = $9, descricao = $10, capa = $11, capa_tipo = $12, capa_arquivo_nome = $13
     WHERE id = $14`,
    [
      normalized.numeroTombo,
      normalized.titulo,
      normalized.autor,
      normalized.categoria,
      normalized.quantidade,
      normalized.quantidade - borrowedCopies,
      normalized.classificacao,
      normalized.faixaEscolar,
      normalized.diasLeitura,
      normalized.descricao,
      normalized.capa,
      normalized.capaTipo ?? 'url',
      normalized.capaArquivoNome ?? null,
      bookId,
    ],
  );

  if (previousCover !== normalized.capa && isManagedAsset(previousCover)) {
    await deleteManagedAsset(previousCover);
  }

  await registerAuditLog({
    acao: 'livro_editado',
    categoria: 'acervo',
    descricao: `Livro ${normalized.titulo} atualizado.`,
    ator: admin,
    alvoTipo: 'livro',
    alvoId: bookId,
    detalhes: {
      numeroTomboAntes: existing.numero_tombo,
      numeroTomboDepois: normalized.numeroTombo,
      quantidadeAntes: existing.quantidade,
      quantidadeDepois: normalized.quantidade,
      capaAlterada: previousCover !== normalized.capa,
    },
  });

  return {
    success: true,
    message: 'Livro atualizado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const deleteBook = async (actor: User | null | undefined, bookId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const existing = await readBookById(bookId);

  if (!existing) {
    throw new DomainError(404, 'Livro nao encontrado.');
  }

  const hasOpenLoan = await countRows(
    "SELECT COUNT(*)::int AS total FROM loans WHERE livro_id = $1 AND status IN ('pendente', 'aprovado')",
    [bookId],
  );

  if (hasOpenLoan > 0) {
    throw new DomainError(400, 'Há empréstimos pendentes ou ativos para este livro.');
  }

  await withTransaction(async (client) => {
    await execute('DELETE FROM favorites WHERE livro_id = $1', [bookId], client);
    await execute('DELETE FROM reviews WHERE livro_id = $1', [bookId], client);
    await execute('DELETE FROM permissions WHERE livro_id = $1', [bookId], client);
    await execute('DELETE FROM books WHERE id = $1', [bookId], client);
    await registerAuditLog(
      {
        acao: 'livro_excluido',
        categoria: 'acervo',
        descricao: `Livro ${existing.titulo} removido do acervo.`,
        ator: admin,
        alvoTipo: 'livro',
        alvoId: bookId,
        detalhes: {
          numeroTombo: existing.numero_tombo,
        },
      },
      client,
    );
  });

  if (isManagedAsset(existing.capa)) {
    await deleteManagedAsset(existing.capa);
  }

  return {
    success: true,
    message: 'Livro removido do acervo.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const requestLoan = async (
  actor: User | null | undefined,
  bookId: string,
  alunoId?: string,
): Promise<LoanActionResult> => {
  const resolvedActor = ensureActor(actor);
  const studentId = resolvedActor.role === 'aluno' ? resolvedActor.id : alunoId?.trim();

  if (!studentId) {
    throw new DomainError(400, 'Informe o aluno responsavel pelo emprestimo.');
  }

  if (resolvedActor.role !== 'aluno' && resolvedActor.role !== 'admin') {
    throw new DomainError(403, 'Apenas alunos podem solicitar emprestimos.');
  }

  const student = await readUserById(studentId);
  if (!student || !student.ativo || student.role !== 'aluno') {
    throw new DomainError(404, 'Aluno nao encontrado.');
  }

  const loanRequest = await withTransaction(async (client) => {
    const book = await readBookById(bookId, client);
    if (!book) {
      throw new DomainError(404, 'Livro nao encontrado.');
    }

    if (book.quantidade_disponivel <= 0) {
      throw new DomainError(400, 'Este livro esta indisponivel no momento.');
    }

    const blockedPermission = await readPermissionByKey(studentId, bookId, client);
    if (blockedPermission && !blockedPermission.permitido) {
      throw new DomainError(400, blockedPermission.observacao || 'A leitura deste livro esta bloqueada para este aluno.');
    }

    const existingOpenLoan = await readOpenLoanByStudentAndBook(studentId, bookId, client);
    if (existingOpenLoan) {
      return {
        token: existingOpenLoan.token,
        reused: true,
        status: existingOpenLoan.status,
      };
    }

    const activeLoans = await countRows(
      "SELECT COUNT(*)::int AS total FROM loans WHERE aluno_id = $1 AND status IN ('pendente', 'aprovado')",
      [studentId],
      client,
    );

    if (activeLoans >= 3) {
      throw new DomainError(400, 'O aluno ja atingiu o limite de 3 emprestimos simultaneos.');
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const loanToken = generateLoanToken();

      try {
        await execute(
          `INSERT INTO loans (id, livro_id, aluno_id, token, status, data_pedido, data_devolucao_prevista, data_devolucao, observacao)
           VALUES ($1, $2, $3, $4, 'pendente', $5, NULL, NULL, NULL)`,
          [createId('loan'), bookId, studentId, loanToken, today()],
          client,
        );

        return {
          token: loanToken,
          reused: false,
          status: 'pendente' as const,
        };
      } catch (error) {
        if (isUniqueConstraintError(error, 'loans_token_key')) {
          continue;
        }

        if (isUniqueConstraintError(error, 'idx_loans_open_unique_student_book')) {
          const openLoan = await readOpenLoanByStudentAndBook(studentId, bookId, client);
          if (openLoan) {
            return {
              token: openLoan.token,
              reused: true,
              status: openLoan.status,
            };
          }
        }

        throw error;
      }
    }

    throw new DomainError(503, 'Nao foi possivel gerar um token seguro para o emprestimo. Tente novamente.');
  });

  return {
    success: true,
    message: loanRequest.reused
      ? loanRequest.status === 'aprovado'
        ? 'Seu emprestimo ja foi aprovado anteriormente. Use o token existente.'
        : 'Voce ja possui um pedido em andamento para este livro. Use o token existente.'
      : 'Token gerado com sucesso. Aguarde a aprovacao da biblioteca.',
    token: loanRequest.token,
    snapshot: await getSnapshotForUserId(resolvedActor.id),
  };
};

export const approveLoan = async (actor: User | null | undefined, loanId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);

  await withTransaction(async (client) => {
    const loan = await readLoanById(loanId, client);
    if (!loan) {
      throw new DomainError(404, 'Emprestimo nao encontrado.');
    }

    if (loan.status !== 'pendente') {
      throw new DomainError(400, 'Apenas emprestimos pendentes podem ser aprovados.');
    }

    const book = await readBookById(loan.livro_id, client);
    if (!book || book.quantidade_disponivel <= 0) {
      throw new DomainError(400, 'Nao ha exemplares disponiveis para aprovacao.');
    }

    await execute(
      `UPDATE loans
          SET status = 'aprovado', data_devolucao_prevista = $1, observacao = NULL
        WHERE id = $2`,
      [addDays(today(), book.dias_leitura), loan.id],
      client,
    );

    await execute('UPDATE books SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = $1', [book.id], client);
    await registerAuditLog(
      {
        acao: 'emprestimo_aprovado',
        categoria: 'emprestimos',
        descricao: `Empréstimo ${loan.token} aprovado.`,
        ator: admin,
        alvoTipo: 'emprestimo',
        alvoId: loan.id,
        detalhes: {
          livroId: loan.livro_id,
          alunoId: loan.aluno_id,
          dataDevolucaoPrevista: addDays(today(), book.dias_leitura),
        },
      },
      client,
    );
  });

  return {
    success: true,
    message: 'Empréstimo aprovado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const rejectLoan = async (
  actor: User | null | undefined,
  loanId: string,
  observacao?: string,
): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const loan = await readLoanById(loanId);

  if (!loan) {
    throw new DomainError(404, 'Emprestimo nao encontrado.');
  }

  if (loan.status !== 'pendente') {
    throw new DomainError(400, 'Apenas emprestimos pendentes podem ser recusados.');
  }

  await execute("UPDATE loans SET status = 'recusado', observacao = $1 WHERE id = $2", [
    observacao?.trim() || 'Solicitacao recusada pela administracao.',
    loanId,
  ]);
  await registerAuditLog({
    acao: 'emprestimo_recusado',
    categoria: 'emprestimos',
    descricao: `Empréstimo ${loan.token} recusado.`,
    ator: admin,
    alvoTipo: 'emprestimo',
    alvoId: loanId,
    detalhes: {
      alunoId: loan.aluno_id,
      livroId: loan.livro_id,
      observacao: observacao?.trim() || 'Solicitação recusada pela administração.',
    },
  });

  return {
    success: true,
    message: 'Empréstimo recusado.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const returnLoan = async (actor: User | null | undefined, loanId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);

  await withTransaction(async (client) => {
    const loan = await readLoanById(loanId, client);
    if (!loan) {
      throw new DomainError(404, 'Emprestimo nao encontrado.');
    }

    if (loan.status !== 'aprovado') {
      throw new DomainError(400, 'Apenas emprestimos aprovados podem ser devolvidos.');
    }

    await execute("UPDATE loans SET status = 'devolvido', data_devolucao = $1 WHERE id = $2", [today(), loan.id], client);
    await execute(
      `UPDATE books
          SET quantidade_disponivel = CASE
            WHEN quantidade_disponivel + 1 > quantidade THEN quantidade
            ELSE quantidade_disponivel + 1
          END
        WHERE id = $1`,
      [loan.livro_id],
      client,
    );
    await registerAuditLog(
      {
        acao: 'emprestimo_devolvido',
        categoria: 'emprestimos',
        descricao: `Devolução registrada para o empréstimo ${loan.token}.`,
        ator: admin,
        alvoTipo: 'emprestimo',
        alvoId: loan.id,
        detalhes: {
          livroId: loan.livro_id,
          alunoId: loan.aluno_id,
          estavaAtrasado:
            Boolean(loan.data_devolucao_prevista) &&
            loan.data_devolucao_prevista! < today() &&
            !loan.data_devolucao,
        },
      },
      client,
    );
  });

  return {
    success: true,
    message: 'Devolução registrada com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const createSuggestion = async (
  actor: User | null | undefined,
  input: Omit<TeacherSuggestion, 'id' | 'criadoEm' | 'professorId'>,
): Promise<ActionResult> => {
  const teacher = assertRole(actor, ['professor']);
  const book = await readBookById(input.livroId);

  if (!book) {
    throw new DomainError(404, 'Livro nao encontrado.');
  }

  const turma = coerceSchoolClass(input.turma);
  const mensagem = sanitizeMultilineText(input.mensagem);
  if (!turma || !mensagem) {
    throw new DomainError(400, 'Selecione uma turma valida e escreva a mensagem da sugestao.');
  }

  await execute(
    `INSERT INTO suggestions (id, professor_id, livro_id, turma, mensagem, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [createId('suggestion'), teacher.id, input.livroId, turma, mensagem, today()],
  );

  return {
    success: true,
    message: 'Sugestao enviada com sucesso.',
    snapshot: await getSnapshotForUserId(teacher.id),
  };
};

export const createTicket = async (
  actor: User | null | undefined,
  input: Omit<SupportTicket, 'id' | 'status' | 'criadoEm' | 'resposta' | 'usuarioId'>,
): Promise<ActionResult> => {
  const user = ensureActor(actor);
  const assunto = input.assunto.trim();
  const mensagem = sanitizeMultilineText(input.mensagem);

  if (!assunto || !mensagem) {
    throw new DomainError(400, 'Preencha assunto e mensagem do suporte.');
  }

  await execute(
    `INSERT INTO tickets (id, usuario_id, assunto, mensagem, status, resposta, criado_em)
     VALUES ($1, $2, $3, $4, 'aberto', NULL, $5)`,
    [createId('ticket'), user.id, assunto, mensagem, today()],
  );

  return {
    success: true,
    message: 'Chamado aberto com sucesso.',
    snapshot: await getSnapshotForUserId(user.id),
  };
};

export const updateTicket = async (
  actor: User | null | undefined,
  ticketId: string,
  input: TicketUpdateInput,
): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const ticket = await queryOne<{ id: string }>('SELECT id FROM tickets WHERE id = $1', [ticketId]);

  if (!ticket) {
    throw new DomainError(404, 'Chamado nao encontrado.');
  }

  await execute('UPDATE tickets SET status = $1, resposta = $2 WHERE id = $3', [
    input.status,
    input.resposta?.trim() || null,
    ticketId,
  ]);

  return {
    success: true,
    message: 'Chamado atualizado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const createTeacherTokenAction = async (
  actor: User | null | undefined,
  descricao: string,
  turmasPermitidas: string[],
): Promise<TeacherTokenActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const normalizedDescription = descricao.trim();
  const requestedTurmas = turmasPermitidas.map((turma) => turma.trim()).filter(Boolean);
  const normalizedTurmas = normalizeSchoolClassList(requestedTurmas);

  if (!normalizedDescription || normalizedTurmas.length === 0) {
    throw new DomainError(400, 'Informe descricao e pelo menos uma turma permitida.');
  }

  if (normalizedTurmas.length !== new Set(requestedTurmas).size) {
    throw new DomainError(400, 'Selecione apenas turmas validas para o token.');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateTeacherToken();
    const tokenId = createId('teacher-token');

    try {
      await execute(
        `INSERT INTO teacher_tokens (id, token, descricao, turmas_permitidas, usado, usado_por_id, criado_em)
         VALUES ($1, $2, $3, $4, FALSE, NULL, $5)`,
        [tokenId, token, normalizedDescription, JSON.stringify(normalizedTurmas), today()],
      );
      await registerAuditLog({
        acao: 'token_professor_gerado',
        categoria: 'tokens',
        descricao: `Token de professor criado para ${normalizedDescription}.`,
        ator: admin,
        alvoTipo: 'token_professor',
        alvoId: tokenId,
        detalhes: {
          token,
          turmasPermitidas: normalizedTurmas,
        },
      });

      return {
        success: true,
        message: 'Token criado com sucesso.',
        token,
        snapshot: await getSnapshotForUserId(admin.id),
      };
    } catch (error) {
      if (isUniqueConstraintError(error, 'teacher_tokens_token_key')) {
        continue;
      }

      throw error;
    }
  }

  throw new DomainError(503, 'Nao foi possivel gerar um token seguro para professor. Tente novamente.');
};

export const toggleTeacherToken = async (actor: User | null | undefined, tokenId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const token = await readTeacherTokenById(tokenId);

  if (!token) {
    throw new DomainError(404, 'Token nao encontrado.');
  }

  if (token.usado_por_id) {
    throw new DomainError(400, 'Tokens ja vinculados a um professor nao podem ser alterados.');
  }

  await execute('UPDATE teacher_tokens SET usado = $1 WHERE id = $2', [!token.usado, tokenId]);

  return {
    success: true,
    message: token.usado ? 'Token reativado com sucesso.' : 'Token marcado como indisponivel.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const savePermission = async (
  actor: User | null | undefined,
  input: Omit<ReadingPermission, 'id' | 'criadoEm' | 'atualizadoEm'>,
): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const [aluno, livro, existing] = await Promise.all([
    readUserById(input.alunoId),
    readBookById(input.livroId),
    readPermissionByKey(input.alunoId, input.livroId),
  ]);
  const permissionId = existing?.id ?? createId('permission');

  if (!aluno || aluno.role !== 'aluno') {
    throw new DomainError(404, 'Aluno nao encontrado.');
  }

  if (!livro) {
    throw new DomainError(404, 'Livro nao encontrado.');
  }

  await execute(
    `INSERT INTO permissions (id, aluno_id, livro_id, permitido, observacao, criado_em, atualizado_em, criado_por_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (aluno_id, livro_id)
     DO UPDATE SET permitido = EXCLUDED.permitido, observacao = EXCLUDED.observacao,
                   atualizado_em = EXCLUDED.atualizado_em, criado_por_id = EXCLUDED.criado_por_id`,
    [
      permissionId,
      input.alunoId,
      input.livroId,
      input.permitido,
      input.observacao?.trim() || null,
      existing?.criado_em ?? today(),
      today(),
      input.criadoPorId ?? admin.id,
    ],
  );
  await registerAuditLog({
    acao: 'permissao_alterada',
    categoria: 'permissoes',
    descricao: `Permissão de leitura ${input.permitido ? 'liberada' : 'bloqueada'} para ${aluno.nome}.`,
    ator: admin,
    alvoTipo: 'permissao',
    alvoId: permissionId,
    detalhes: {
      alunoId: input.alunoId,
      livroId: input.livroId,
      permitido: input.permitido,
      observacao: input.observacao?.trim() || null,
    },
  });

  return {
    success: true,
    message: existing ? 'Permissao atualizada com sucesso.' : 'Permissao registrada com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const toggleFavorite = async (
  actor: User | null | undefined,
  bookId: string,
  usuarioId?: string,
): Promise<ActionResult> => {
  const user = ensureActor(actor);
  const resolvedUserId = user.role === 'admin' && usuarioId ? usuarioId : user.id;

  if (user.role !== 'admin' && usuarioId && usuarioId !== user.id) {
    throw new DomainError(403, 'Voce so pode alterar seus proprios favoritos.');
  }

  const [book, targetUser, existing] = await Promise.all([
    readBookById(bookId),
    readUserById(resolvedUserId),
    queryOne<{ id: string }>('SELECT id FROM favorites WHERE livro_id = $1 AND usuario_id = $2', [bookId, resolvedUserId]),
  ]);

  if (!book || !targetUser || !targetUser.ativo) {
    throw new DomainError(404, 'Livro ou usuario nao encontrado.');
  }

  if (existing) {
    await execute('DELETE FROM favorites WHERE id = $1', [existing.id]);
  } else {
    await execute(
      `INSERT INTO favorites (id, usuario_id, livro_id, criado_em)
       VALUES ($1, $2, $3, $4)`,
      [createId('favorite'), resolvedUserId, bookId, today()],
    );
  }

  return {
    success: true,
    message: existing ? 'Livro removido dos favoritos.' : 'Livro salvo na sua estante de favoritos.',
    snapshot: await getSnapshotForUserId(user.id),
  };
};

export const saveReview = async (actor: User | null | undefined, input: SaveReviewInput): Promise<ActionResult> => {
  const student = assertRole(actor, ['aluno']);
  const reviewerId = input.usuarioId?.trim() || student.id;

  if (reviewerId !== student.id) {
    throw new DomainError(403, 'Voce so pode publicar sua propria resenha.');
  }

  const book = await readBookById(input.livroId);
  if (!book) {
    throw new DomainError(404, 'Livro nao encontrado.');
  }

  const comentario = sanitizeMultilineText(input.comentario);
  if (comentario.length < 16) {
    throw new DomainError(400, 'Escreva uma resenha com pelo menos 16 caracteres.');
  }

  if (![1, 2, 3, 4, 5].includes(input.nota)) {
    throw new DomainError(400, 'A nota deve ficar entre 1 e 5.');
  }

  const hasCompletedLoan = await countRows(
    "SELECT COUNT(*)::int AS total FROM loans WHERE aluno_id = $1 AND livro_id = $2 AND status = 'devolvido'",
    [student.id, input.livroId],
  );

  if (hasCompletedLoan === 0) {
    throw new DomainError(400, 'A resenha fica disponivel depois que o aluno concluir a leitura e devolver o livro.');
  }

  const existing = await queryOne<{ id: string; criado_em: string }>(
    'SELECT id, criado_em FROM reviews WHERE livro_id = $1 AND usuario_id = $2',
    [input.livroId, student.id],
  );

  await execute(
    `INSERT INTO reviews (id, livro_id, usuario_id, nota, comentario, criado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (livro_id, usuario_id)
     DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario, atualizado_em = EXCLUDED.atualizado_em`,
    [
      existing?.id ?? createId('review'),
      input.livroId,
      student.id,
      input.nota,
      comentario,
      existing?.criado_em ?? today(),
      existing ? today() : null,
    ],
  );

  return {
    success: true,
    message: existing ? 'Resenha atualizada com sucesso.' : 'Resenha publicada com sucesso.',
    snapshot: await getSnapshotForUserId(student.id),
  };
};

export const createNotice = async (actor: User | null | undefined, input: CreateNoticeInput): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const titulo = input.titulo.trim();
  const mensagem = sanitizeMultilineText(input.mensagem);
  const noticeId = createId('notice');

  if (!titulo || !mensagem) {
    throw new DomainError(400, 'Preencha titulo e mensagem do aviso.');
  }

  await execute(
    `INSERT INTO notices (id, titulo, mensagem, categoria, publico, ativo, destaque, criado_em, criado_por_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      noticeId,
      titulo,
      mensagem,
      input.categoria,
      input.publico,
      input.ativo === false ? false : true,
      Boolean(input.destaque),
      today(),
      input.criadoPorId ?? admin.id,
    ],
  );
  await registerAuditLog({
    acao: 'aviso_criado',
    categoria: 'avisos',
    descricao: `Aviso "${titulo}" publicado.`,
    ator: admin,
    alvoTipo: 'aviso',
    alvoId: noticeId,
    detalhes: {
      categoria: input.categoria,
      publico: input.publico,
      destaque: Boolean(input.destaque),
    },
  });

  return {
    success: true,
    message: 'Aviso publicado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const toggleNoticeStatus = async (actor: User | null | undefined, noticeId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const notice = await queryOne<{ ativo: boolean }>('SELECT ativo FROM notices WHERE id = $1', [noticeId]);

  if (!notice) {
    throw new DomainError(404, 'Aviso nao encontrado.');
  }

  await execute('UPDATE notices SET ativo = $1 WHERE id = $2', [!notice.ativo, noticeId]);

  return {
    success: true,
    message: notice.ativo ? 'Aviso pausado com sucesso.' : 'Aviso reativado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const toggleNoticeHighlight = async (actor: User | null | undefined, noticeId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const notice = await queryOne<{ destaque: boolean }>('SELECT destaque FROM notices WHERE id = $1', [noticeId]);

  if (!notice) {
    throw new DomainError(404, 'Aviso nao encontrado.');
  }

  await execute('UPDATE notices SET destaque = $1 WHERE id = $2', [!notice.destaque, noticeId]);

  return {
    success: true,
    message: notice.destaque ? 'Aviso removido dos destaques.' : 'Aviso destacado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const createDocument = async (actor: User | null | undefined, input: SaveDocumentInput): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const normalized = normalizeDocumentInput(input);
  const documentId = createId('document');

  await execute(
    `INSERT INTO documents (id, titulo, descricao, categoria, publico, arquivo_url, arquivo_nome, arquivo_mime, arquivo_tamanho, ativo, destaque, criado_em, atualizado_em, criado_por_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      documentId,
      normalized.titulo,
      normalized.descricao,
      normalized.categoria,
      normalized.publico,
      normalized.arquivoUrl,
      normalized.arquivoNome,
      normalized.arquivoMime,
      normalized.arquivoTamanho,
      normalized.ativo,
      normalized.destaque,
      today(),
      today(),
      admin.id,
    ],
  );

  await registerAuditLog({
    acao: 'documento_criado',
    categoria: 'documentos',
    descricao: `Documento ${normalized.titulo} publicado.`,
    ator: admin,
    alvoTipo: 'documento',
    alvoId: documentId,
    detalhes: {
      categoria: normalized.categoria,
      publico: normalized.publico,
      arquivoNome: normalized.arquivoNome,
    },
  });

  return {
    success: true,
    message: 'Documento publicado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const updateDocument = async (
  actor: User | null | undefined,
  documentId: string,
  input: SaveDocumentInput,
): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const normalized = normalizeDocumentInput(input);
  const existing = await readDocumentById(documentId);

  if (!existing) {
    throw new DomainError(404, 'Documento não encontrado.');
  }

  await execute(
    `UPDATE documents
        SET titulo = $1,
            descricao = $2,
            categoria = $3,
            publico = $4,
            arquivo_url = $5,
            arquivo_nome = $6,
            arquivo_mime = $7,
            arquivo_tamanho = $8,
            ativo = $9,
            destaque = $10,
            atualizado_em = $11
      WHERE id = $12`,
    [
      normalized.titulo,
      normalized.descricao,
      normalized.categoria,
      normalized.publico,
      normalized.arquivoUrl,
      normalized.arquivoNome,
      normalized.arquivoMime,
      normalized.arquivoTamanho,
      normalized.ativo,
      normalized.destaque,
      today(),
      documentId,
    ],
  );

  if (existing.arquivo_url !== normalized.arquivoUrl && isManagedAsset(existing.arquivo_url)) {
    await deleteManagedAsset(existing.arquivo_url);
  }

  await registerAuditLog({
    acao: 'documento_editado',
    categoria: 'documentos',
    descricao: `Documento ${normalized.titulo} atualizado.`,
    ator: admin,
    alvoTipo: 'documento',
    alvoId: documentId,
    detalhes: {
      tituloAntes: existing.titulo,
      tituloDepois: normalized.titulo,
      arquivoAlterado: existing.arquivo_url !== normalized.arquivoUrl,
    },
  });

  return {
    success: true,
    message: 'Documento atualizado com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const deleteDocument = async (actor: User | null | undefined, documentId: string): Promise<ActionResult> => {
  const admin = assertRole(actor, ['admin']);
  const existing = await readDocumentById(documentId);

  if (!existing) {
    throw new DomainError(404, 'Documento não encontrado.');
  }

  await withTransaction(async (client) => {
    await execute('DELETE FROM documents WHERE id = $1', [documentId], client);
    await registerAuditLog(
      {
        acao: 'documento_excluido',
        categoria: 'documentos',
        descricao: `Documento ${existing.titulo} excluído.`,
        ator: admin,
        alvoTipo: 'documento',
        alvoId: documentId,
        detalhes: {
          arquivoNome: existing.arquivo_nome,
        },
      },
      client,
    );
  });

  if (isManagedAsset(existing.arquivo_url)) {
    await deleteManagedAsset(existing.arquivo_url);
  }

  return {
    success: true,
    message: 'Documento removido com sucesso.',
    snapshot: await getSnapshotForUserId(admin.id),
  };
};

export const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;
