import { createHash, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { newDb } from 'pg-mem';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { mockBooks } from '../src/data/mock-books';
import { mockFavorites, mockNotices, mockReviews } from '../src/data/mock-community';
import { mockLoans, mockSuggestions, mockTeacherTokens, mockTickets } from '../src/data/mock-loans';
import { mockUsers } from '../src/data/mock-users';
import {
  AuditLog,
  Book,
  BookReview,
  FavoriteBook,
  LibraryDocument,
  LibraryNotice,
  Loan,
  LoanStatusBase,
  ReadingPermission,
  SupportTicket,
  TeacherSuggestion,
  TeacherToken,
  User,
  UserRole,
} from '../src/types';
import { serverConfig } from './config';
import { logInfo, logWarn } from './logger';
import { migrations } from './migrations';
import { validatePasswordStrength } from './passwords';

type DatabaseFlag = boolean | number;

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

export interface PublicSiteBook extends Book {
  averageReview: number;
  reviewCount: number;
}

export interface PublicSiteData {
  overview: PublicOverview;
  pendingLoans: number;
  completedLoans: number;
  totalFavorites: number;
  totalReviews: number;
  studentsCount: number;
  teachersCount: number;
  activeNotices: LibraryNotice[];
  highlightedNotices: LibraryNotice[];
  topBooks: PublicSiteBook[];
}

export type UserRow = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: DatabaseFlag;
  senha_hash: string;
  turma: string | null;
  token_professor_id: string | null;
  ultimo_acesso: string | null;
  criado_em: string;
  email_confirmado?: DatabaseFlag;
  email_confirmado_em?: string | null;
};

export type BookRow = {
  id: string;
  numero_tombo: string;
  titulo: string;
  autor: string;
  categoria: string;
  quantidade: number;
  quantidade_disponivel: number;
  classificacao: number;
  faixa_escolar: string;
  dias_leitura: number;
  descricao: string;
  capa: string;
  capa_tipo?: Book['capaTipo'];
  capa_arquivo_nome?: string | null;
};

export type LoanRow = {
  id: string;
  livro_id: string;
  aluno_id: string;
  token: string;
  status: LoanStatusBase;
  data_pedido: string;
  data_devolucao_prevista: string | null;
  data_devolucao: string | null;
  observacao: string | null;
};

export type SuggestionRow = {
  id: string;
  professor_id: string;
  livro_id: string;
  turma: string;
  mensagem: string;
  criado_em: string;
};

export type TicketRow = {
  id: string;
  usuario_id: string;
  assunto: string;
  mensagem: string;
  status: SupportTicket['status'];
  resposta: string | null;
  criado_em: string;
};

export type TeacherTokenRow = {
  id: string;
  token: string;
  descricao: string;
  turmas_permitidas: string;
  usado: DatabaseFlag;
  usado_por_id: string | null;
  criado_em: string;
};

export type PermissionRow = {
  id: string;
  aluno_id: string;
  livro_id: string;
  permitido: DatabaseFlag;
  observacao: string | null;
  criado_em: string;
  atualizado_em: string;
  criado_por_id: string | null;
};

export type FavoriteRow = {
  id: string;
  usuario_id: string;
  livro_id: string;
  criado_em: string;
};

export type ReviewRow = {
  id: string;
  livro_id: string;
  usuario_id: string;
  nota: BookReview['nota'];
  comentario: string;
  criado_em: string;
  atualizado_em: string | null;
};

export type NoticeRow = {
  id: string;
  titulo: string;
  mensagem: string;
  categoria: LibraryNotice['categoria'];
  publico: LibraryNotice['publico'];
  ativo: DatabaseFlag;
  destaque: DatabaseFlag;
  criado_em: string;
  criado_por_id: string | null;
};

export type DocumentRow = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: LibraryDocument['categoria'];
  publico: LibraryDocument['publico'];
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_mime: string;
  arquivo_tamanho: number;
  ativo: DatabaseFlag;
  destaque: DatabaseFlag;
  criado_em: string;
  atualizado_em: string;
  criado_por_id: string | null;
};

export type AuditLogRow = {
  id: string;
  acao: AuditLog['acao'];
  categoria: AuditLog['categoria'];
  descricao: string;
  ator_id: string | null;
  ator_nome: string | null;
  ator_role: UserRole | null;
  alvo_tipo: AuditLog['alvoTipo'];
  alvo_id: string | null;
  detalhes: string | null;
  criado_em: string;
};

export type QueryExecutor = Pick<Pool, 'query'> | Pick<PoolClient, 'query'>;

export interface BootstrapAdminResult {
  created: boolean;
  skippedReason?: 'not_configured' | 'existing_admin' | 'email_in_use';
  email?: string;
  userId?: string;
}

const createPool = () => {
  if (serverConfig.databaseUrl) {
    return new Pool({
      connectionString: serverConfig.databaseUrl,
      ssl: serverConfig.databaseSsl ? { rejectUnauthorized: false } : undefined,
      max: serverConfig.databasePoolMax,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }

  const memoryDatabase = newDb({
    autoCreateForeignKeyIndices: true,
  });

  const adapter = memoryDatabase.adapters.createPg();
  return new adapter.Pool();
};

const pool = createPool();
let initializationPromise: Promise<void> | null = null;

const getExecutor = (executor?: QueryExecutor) => executor ?? pool;

export const databaseProvider = serverConfig.databaseUrl ? 'postgres' : 'memory';

export const today = () => new Date().toISOString().slice(0, 10);
export const nowIso = () => new Date().toISOString();

export const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

export const diffDays = (fromDate: string, toDate: string) => {
  const start = new Date(`${fromDate}T12:00:00`);
  const end = new Date(`${toDate}T12:00:00`);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
};

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const STUDENT_EMAIL_DOMAIN = '@aluno.educacao.sp.gov.br';

export const isValidStudentInstitutionalEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(STUDENT_EMAIL_DOMAIN) && normalized !== STUDENT_EMAIL_DOMAIN;
};

export const sanitizeMultilineText = (value: string) =>
  value
    .trim()
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');

export const parseTurmas = (value: string) => {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
};

export const serializeUser = (row: UserRow): User => ({
  id: row.id,
  nome: row.nome,
  email: row.email,
  role: row.role,
  ativo: Boolean(row.ativo),
  turma: row.turma ?? undefined,
  tokenProfessorId: row.token_professor_id ?? undefined,
  ultimoAcesso: row.ultimo_acesso ?? undefined,
  criadoEm: row.criado_em,
  emailConfirmado: row.email_confirmado == null ? true : Boolean(row.email_confirmado),
  emailConfirmadoEm: row.email_confirmado_em ?? undefined,
});

export const serializeBook = (row: BookRow): Book => ({
  id: row.id,
  numeroTombo: row.numero_tombo,
  titulo: row.titulo,
  autor: row.autor,
  categoria: row.categoria,
  quantidade: row.quantidade,
  quantidadeDisponivel: row.quantidade_disponivel,
  classificacao: row.classificacao,
  faixaEscolar: row.faixa_escolar,
  diasLeitura: row.dias_leitura,
  descricao: row.descricao,
  capa: row.capa,
  capaTipo: row.capa_tipo ?? 'url',
  capaArquivoNome: row.capa_arquivo_nome ?? undefined,
});

export const serializeLoan = (row: LoanRow): Loan => {
  const isOverdue =
    row.status === 'aprovado' &&
    Boolean(row.data_devolucao_prevista) &&
    row.data_devolucao_prevista! < today() &&
    !row.data_devolucao;

  return {
    id: row.id,
    livroId: row.livro_id,
    alunoId: row.aluno_id,
    token: row.token,
    status: isOverdue ? 'atrasado' : row.status,
    statusBase: row.status,
    estaAtrasado: isOverdue,
    diasAtraso: isOverdue ? diffDays(row.data_devolucao_prevista!, today()) : 0,
    dataPedido: row.data_pedido,
    dataDevolucaoPrevista: row.data_devolucao_prevista ?? undefined,
    dataDevolucao: row.data_devolucao ?? undefined,
    observacao: row.observacao ?? undefined,
  };
};

export const serializeSuggestion = (row: SuggestionRow): TeacherSuggestion => ({
  id: row.id,
  professorId: row.professor_id,
  livroId: row.livro_id,
  turma: row.turma,
  mensagem: row.mensagem,
  criadoEm: row.criado_em,
});

export const serializeTicket = (row: TicketRow): SupportTicket => ({
  id: row.id,
  usuarioId: row.usuario_id,
  assunto: row.assunto,
  mensagem: row.mensagem,
  status: row.status,
  resposta: row.resposta ?? undefined,
  criadoEm: row.criado_em,
});

export const serializeTeacherToken = (row: TeacherTokenRow): TeacherToken => ({
  id: row.id,
  token: row.token,
  descricao: row.descricao,
  turmasPermitidas: parseTurmas(row.turmas_permitidas),
  usado: Boolean(row.usado),
  usadoPorId: row.usado_por_id ?? undefined,
  criadoEm: row.criado_em,
});

export const serializePermission = (row: PermissionRow): ReadingPermission => ({
  id: row.id,
  alunoId: row.aluno_id,
  livroId: row.livro_id,
  permitido: Boolean(row.permitido),
  observacao: row.observacao ?? undefined,
  criadoEm: row.criado_em,
  atualizadoEm: row.atualizado_em,
  criadoPorId: row.criado_por_id ?? undefined,
});

export const serializeFavorite = (row: FavoriteRow): FavoriteBook => ({
  id: row.id,
  usuarioId: row.usuario_id,
  livroId: row.livro_id,
  criadoEm: row.criado_em,
});

export const serializeReview = (row: ReviewRow): BookReview => ({
  id: row.id,
  livroId: row.livro_id,
  usuarioId: row.usuario_id,
  nota: row.nota,
  comentario: row.comentario,
  criadoEm: row.criado_em,
  atualizadoEm: row.atualizado_em ?? undefined,
});

export const serializeNotice = (row: NoticeRow): LibraryNotice => ({
  id: row.id,
  titulo: row.titulo,
  mensagem: row.mensagem,
  categoria: row.categoria,
  publico: row.publico,
  ativo: Boolean(row.ativo),
  destaque: Boolean(row.destaque),
  criadoEm: row.criado_em,
  criadoPorId: row.criado_por_id ?? undefined,
});

export const serializeDocument = (row: DocumentRow): LibraryDocument => ({
  id: row.id,
  titulo: row.titulo,
  descricao: row.descricao,
  categoria: row.categoria,
  publico: row.publico,
  arquivoUrl: row.arquivo_url,
  arquivoNome: row.arquivo_nome,
  arquivoMime: row.arquivo_mime,
  arquivoTamanho: row.arquivo_tamanho,
  ativo: Boolean(row.ativo),
  destaque: Boolean(row.destaque),
  criadoEm: row.criado_em,
  atualizadoEm: row.atualizado_em,
  criadoPorId: row.criado_por_id ?? undefined,
});

export const serializeAuditLog = (row: AuditLogRow): AuditLog => ({
  id: row.id,
  acao: row.acao,
  categoria: row.categoria,
  descricao: row.descricao,
  atorId: row.ator_id ?? undefined,
  atorNome: row.ator_nome ?? undefined,
  atorRole: row.ator_role ?? undefined,
  alvoTipo: row.alvo_tipo,
  alvoId: row.alvo_id ?? undefined,
  detalhes: row.detalhes ? (JSON.parse(row.detalhes) as Record<string, unknown>) : undefined,
  criadoEm: row.criado_em,
});

export const queryRows = async <T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
  executor?: QueryExecutor,
) => {
  const result = await getExecutor(executor).query(text, values);
  return result.rows as T[];
};

export const queryOne = async <T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
  executor?: QueryExecutor,
) => {
  const rows = await queryRows<T>(text, values, executor);
  return rows[0];
};

export const execute = async (text: string, values: unknown[] = [], executor?: QueryExecutor) => {
  await getExecutor(executor).query(text, values);
};

export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const isLikelyEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const readBootstrapAdminInput = () => {
  const configuredFields = [
    serverConfig.bootstrapAdminName,
    serverConfig.bootstrapAdminEmail,
    serverConfig.bootstrapAdminPassword,
  ].filter(Boolean).length;

  if (configuredFields === 0) {
    return null;
  }

  if (configuredFields < 3) {
    throw new Error(
      'Configure BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD juntos para criar o primeiro administrador.',
    );
  }

  if (!isLikelyEmail(serverConfig.bootstrapAdminEmail)) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL deve ser um e-mail valido.');
  }

  const passwordCheck = validatePasswordStrength(serverConfig.bootstrapAdminPassword);
  if (!passwordCheck.valid) {
    throw new Error(`BOOTSTRAP_ADMIN_PASSWORD invalida: ${passwordCheck.message}`);
  }

  return {
    nome: serverConfig.bootstrapAdminName,
    email: serverConfig.bootstrapAdminEmail,
    senha: serverConfig.bootstrapAdminPassword,
  };
};

const runMigrations = async () => {
  await execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );

  const appliedRows = await queryRows<{ id: string }>('SELECT id FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.id));

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    await withTransaction(async (client) => {
      for (const statement of migration.statements) {
        await client.query(statement);
      }

      await client.query(
        'INSERT INTO schema_migrations (id, description, applied_at) VALUES ($1, $2, $3)',
        [migration.id, migration.description, nowIso()],
      );
    });
  }
};

const seedDatabase = async () => {
  const count = await queryOne<{ total: number }>('SELECT COUNT(*)::int AS total FROM users');
  if ((count?.total ?? 0) > 0) {
    return;
  }

  await withTransaction(async (client) => {
    for (const user of mockUsers) {
      await client.query(
        `INSERT INTO users (id, nome, email, role, ativo, senha_hash, turma, token_professor_id, ultimo_acesso, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          user.id,
          user.nome,
          normalizeEmail(user.email),
          user.role,
          user.ativo,
          bcrypt.hashSync(user.senha || 'senha123', 10),
          user.turma ?? null,
          user.tokenProfessorId ?? null,
          user.ultimoAcesso ?? null,
          user.criadoEm,
        ],
      );
    }

    for (const book of mockBooks) {
      await client.query(
        `INSERT INTO books (id, numero_tombo, titulo, autor, categoria, quantidade, quantidade_disponivel, classificacao, faixa_escolar, dias_leitura, descricao, capa)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          book.id,
          book.numeroTombo,
          book.titulo,
          book.autor,
          book.categoria,
          book.quantidade,
          book.quantidadeDisponivel,
          book.classificacao,
          book.faixaEscolar,
          book.diasLeitura,
          book.descricao,
          book.capa,
        ],
      );
    }

    for (const loan of mockLoans) {
      await client.query(
        `INSERT INTO loans (id, livro_id, aluno_id, token, status, data_pedido, data_devolucao_prevista, data_devolucao, observacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          loan.id,
          loan.livroId,
          loan.alunoId,
          loan.token,
          loan.status,
          loan.dataPedido,
          loan.dataDevolucaoPrevista ?? null,
          loan.dataDevolucao ?? null,
          loan.observacao ?? null,
        ],
      );
    }

    for (const suggestion of mockSuggestions) {
      await client.query(
        `INSERT INTO suggestions (id, professor_id, livro_id, turma, mensagem, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          suggestion.id,
          suggestion.professorId,
          suggestion.livroId,
          suggestion.turma,
          suggestion.mensagem,
          suggestion.criadoEm,
        ],
      );
    }

    for (const ticket of mockTickets) {
      await client.query(
        `INSERT INTO tickets (id, usuario_id, assunto, mensagem, status, resposta, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ticket.id,
          ticket.usuarioId,
          ticket.assunto,
          ticket.mensagem,
          ticket.status,
          ticket.resposta ?? null,
          ticket.criadoEm,
        ],
      );
    }

    for (const token of mockTeacherTokens) {
      await client.query(
        `INSERT INTO teacher_tokens (id, token, descricao, turmas_permitidas, usado, usado_por_id, criado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          token.id,
          token.token,
          token.descricao,
          JSON.stringify(token.turmasPermitidas),
          token.usado,
          token.usadoPorId ?? null,
          token.criadoEm,
        ],
      );
    }

    await client.query(
      `INSERT INTO permissions (id, aluno_id, livro_id, permitido, observacao, criado_em, atualizado_em, criado_por_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'perm-1',
        '1',
        '2',
        true,
        'Leitura aprovada para reforco de literatura brasileira.',
        '2025-03-01',
        '2025-03-01',
        '6',
      ],
    );

    for (const favorite of mockFavorites) {
      await client.query(
        `INSERT INTO favorites (id, usuario_id, livro_id, criado_em)
         VALUES ($1, $2, $3, $4)`,
        [favorite.id, favorite.usuarioId, favorite.livroId, favorite.criadoEm],
      );
    }

    for (const review of mockReviews) {
      await client.query(
        `INSERT INTO reviews (id, livro_id, usuario_id, nota, comentario, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          review.id,
          review.livroId,
          review.usuarioId,
          review.nota,
          review.comentario,
          review.criadoEm,
          review.atualizadoEm ?? null,
        ],
      );
    }

    for (const notice of mockNotices) {
      await client.query(
        `INSERT INTO notices (id, titulo, mensagem, categoria, publico, ativo, destaque, criado_em, criado_por_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          notice.id,
          notice.titulo,
          notice.mensagem,
          notice.categoria,
          notice.publico,
          notice.ativo,
          notice.destaque,
          notice.criadoEm,
          notice.criadoPorId ?? null,
        ],
      );
    }
  });
};

export const ensureBootstrapAdmin = async (): Promise<BootstrapAdminResult> => {
  const input = readBootstrapAdminInput();
  if (!input) {
    return { created: false, skippedReason: 'not_configured' };
  }

  const activeAdminCount = await queryOne<{ total: number }>(
    "SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin' AND ativo = TRUE",
  );

  if ((activeAdminCount?.total ?? 0) > 0) {
    return {
      created: false,
      skippedReason: 'existing_admin',
      email: input.email,
    };
  }

  const existingUser = await readUserByEmail(input.email);
  if (existingUser) {
    return {
      created: false,
      skippedReason: 'email_in_use',
      email: input.email,
    };
  }

  const userId = createId('user');
  const createdAt = today();
  const passwordHash = await bcrypt.hash(input.senha, 10);

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO users (id, nome, email, role, ativo, senha_hash, turma, token_professor_id, ultimo_acesso, criado_em, email_confirmado, email_confirmado_em)
       VALUES ($1, $2, $3, 'admin', TRUE, $4, NULL, NULL, $5, $5, TRUE, $5)`,
      [userId, input.nome, input.email, passwordHash, createdAt],
    );

    await client.query(
      `INSERT INTO audit_logs (id, acao, categoria, descricao, ator_id, ator_nome, ator_role, alvo_tipo, alvo_id, detalhes, criado_em)
       VALUES ($1, 'usuario_criado', 'usuarios', $2, NULL, NULL, NULL, 'usuario', $3, $4, $5)`,
      [
        createId('audit'),
        `Administrador bootstrap criado para ${input.email}.`,
        userId,
        JSON.stringify({
          origem: 'bootstrap_admin',
          email: input.email,
          role: 'admin',
        }),
        nowIso(),
      ],
    );
  });

  logInfo('Administrador bootstrap criado com sucesso.', {
    email: input.email,
    userId,
  });

  return {
    created: true,
    email: input.email,
    userId,
  };
};

export const initDatabase = async () => {
  if (!serverConfig.databaseUrl && serverConfig.nodeEnv === 'production' && !serverConfig.allowInMemoryDatabase) {
    throw new Error('DATABASE_URL e obrigatoria em producao. Defina o banco PostgreSQL antes de publicar.');
  }

  if (!serverConfig.databaseUrl && serverConfig.nodeEnv === 'production' && !serverConfig.allowInMemoryDatabase) {
    throw new Error('DATABASE_URL é obrigatória em produção. Defina o banco PostgreSQL antes de publicar.');
  }

  if (serverConfig.nodeEnv === 'production' && serverConfig.seedDemoData && !serverConfig.allowInMemoryDatabase) {
    throw new Error('SEED_DEMO_DATA nao pode ficar ativo em producao.');
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (!serverConfig.databaseUrl) {
        logWarn('Banco em memoria ativo. Use PostgreSQL antes de publicar.', {
          environment: serverConfig.nodeEnv,
        });
      }

      await runMigrations();
      if (serverConfig.seedDemoData) {
        logWarn('Dados de demonstracao ativados apenas para ambiente controlado.', {
          environment: serverConfig.nodeEnv,
        });
        await seedDatabase();
      }

      const bootstrapResult = await ensureBootstrapAdmin();
      if (bootstrapResult.skippedReason === 'email_in_use') {
        throw new Error(
          `BOOTSTRAP_ADMIN_EMAIL (${bootstrapResult.email}) ja pertence a outro usuario. Ajuste o e-mail ou remova o cadastro antigo.`,
        );
      }
    })();
  }

  await initializationPromise;
};

export const closeDatabase = async () => {
  await pool.end();
};

export const readUsers = async (executor?: QueryExecutor) =>
  queryRows<UserRow>('SELECT * FROM users ORDER BY criado_em DESC', [], executor);

export const readActiveUsers = async (executor?: QueryExecutor) =>
  queryRows<UserRow>('SELECT * FROM users WHERE ativo = TRUE ORDER BY criado_em DESC', [], executor);

export const readBooks = async (executor?: QueryExecutor) =>
  queryRows<BookRow>('SELECT * FROM books ORDER BY titulo ASC', [], executor);

export const readLoans = async (executor?: QueryExecutor) =>
  queryRows<LoanRow>('SELECT * FROM loans ORDER BY data_pedido DESC', [], executor);

export const readLoansByStudent = async (studentId: string, executor?: QueryExecutor) =>
  queryRows<LoanRow>('SELECT * FROM loans WHERE aluno_id = $1 ORDER BY data_pedido DESC', [studentId], executor);

export const readSuggestions = async (executor?: QueryExecutor) =>
  queryRows<SuggestionRow>('SELECT * FROM suggestions ORDER BY criado_em DESC', [], executor);

export const readSuggestionsByProfessor = async (professorId: string, executor?: QueryExecutor) =>
  queryRows<SuggestionRow>('SELECT * FROM suggestions WHERE professor_id = $1 ORDER BY criado_em DESC', [professorId], executor);

export const readTickets = async (executor?: QueryExecutor) =>
  queryRows<TicketRow>('SELECT * FROM tickets ORDER BY criado_em DESC', [], executor);

export const readTicketsByUser = async (userId: string, executor?: QueryExecutor) =>
  queryRows<TicketRow>('SELECT * FROM tickets WHERE usuario_id = $1 ORDER BY criado_em DESC', [userId], executor);

export const readTeacherTokens = async (executor?: QueryExecutor) =>
  queryRows<TeacherTokenRow>('SELECT * FROM teacher_tokens ORDER BY criado_em DESC', [], executor);

export const readPermissions = async (executor?: QueryExecutor) =>
  queryRows<PermissionRow>('SELECT * FROM permissions ORDER BY atualizado_em DESC', [], executor);

export const readPermissionsByStudent = async (studentId: string, executor?: QueryExecutor) =>
  queryRows<PermissionRow>('SELECT * FROM permissions WHERE aluno_id = $1 ORDER BY atualizado_em DESC', [studentId], executor);

export const readFavorites = async (executor?: QueryExecutor) =>
  queryRows<FavoriteRow>('SELECT * FROM favorites ORDER BY criado_em DESC', [], executor);

export const readFavoritesByUser = async (userId: string, executor?: QueryExecutor) =>
  queryRows<FavoriteRow>('SELECT * FROM favorites WHERE usuario_id = $1 ORDER BY criado_em DESC', [userId], executor);

export const readReviews = async (executor?: QueryExecutor) =>
  queryRows<ReviewRow>('SELECT * FROM reviews ORDER BY COALESCE(atualizado_em, criado_em) DESC', [], executor);

export const readNotices = async (executor?: QueryExecutor) =>
  queryRows<NoticeRow>('SELECT * FROM notices ORDER BY criado_em DESC', [], executor);

export const readDocuments = async (executor?: QueryExecutor) =>
  queryRows<DocumentRow>('SELECT * FROM documents ORDER BY destaque DESC, atualizado_em DESC', [], executor);

export const readVisibleNotices = async (role: UserRole | null, executor?: QueryExecutor) => {
  if (!role) {
    return queryRows<NoticeRow>(
      "SELECT * FROM notices WHERE ativo = TRUE AND publico = 'todos' ORDER BY criado_em DESC",
      [],
      executor,
    );
  }

  if (role === 'aluno') {
    return queryRows<NoticeRow>(
      "SELECT * FROM notices WHERE ativo = TRUE AND publico IN ('todos', 'alunos') ORDER BY criado_em DESC",
      [],
      executor,
    );
  }

  return queryRows<NoticeRow>(
    "SELECT * FROM notices WHERE ativo = TRUE AND publico IN ('todos', 'professores') ORDER BY criado_em DESC",
    [],
    executor,
  );
};

export const readVisibleDocuments = async (role: UserRole | null, executor?: QueryExecutor) => {
  if (!role) {
    return queryRows<DocumentRow>(
      "SELECT * FROM documents WHERE ativo = TRUE AND publico = 'todos' ORDER BY destaque DESC, atualizado_em DESC",
      [],
      executor,
    );
  }

  if (role === 'aluno') {
    return queryRows<DocumentRow>(
      "SELECT * FROM documents WHERE ativo = TRUE AND publico IN ('todos', 'alunos') ORDER BY destaque DESC, atualizado_em DESC",
      [],
      executor,
    );
  }

  if (role === 'professor') {
    return queryRows<DocumentRow>(
      "SELECT * FROM documents WHERE ativo = TRUE AND publico IN ('todos', 'professores') ORDER BY destaque DESC, atualizado_em DESC",
      [],
      executor,
    );
  }

  return readDocuments(executor);
};

export const getLibrarySnapshot = async (): Promise<LibrarySnapshot> => {
  const [books, users, loans, suggestions, tickets, teacherTokens, permissions, favorites, reviews, notices, documents] =
    await Promise.all([
      readBooks(),
      readUsers(),
      readLoans(),
      readSuggestions(),
      readTickets(),
      readTeacherTokens(),
      readPermissions(),
      readFavorites(),
      readReviews(),
      readNotices(),
      readDocuments(),
    ]);

  return {
    books: books.map(serializeBook),
    users: users.map(serializeUser),
    loans: loans.map(serializeLoan),
    suggestions: suggestions.map(serializeSuggestion),
    tickets: tickets.map(serializeTicket),
    teacherTokens: teacherTokens.map(serializeTeacherToken),
    permissions: permissions.map(serializePermission),
    favorites: favorites.map(serializeFavorite),
    reviews: reviews.map(serializeReview),
    notices: notices.map(serializeNotice),
    documents: documents.map(serializeDocument),
  };
};

export const getPublicOverview = async (): Promise<PublicOverview> => {
  const [books, notices, activeLoans, suggestions, users] = await Promise.all([
    readBooks(),
    readNotices(),
    queryOne<{ total: number }>("SELECT COUNT(*)::int AS total FROM loans WHERE status = 'aprovado'"),
    queryOne<{ total: number }>('SELECT COUNT(*)::int AS total FROM suggestions'),
    queryOne<{ total: number }>('SELECT COUNT(*)::int AS total FROM users WHERE ativo = TRUE'),
  ]);

  const activeNoticeRows = notices.filter((notice) => Boolean(notice.ativo)).map(serializeNotice);

  return {
    totalBooks: books.length,
    availableCopies: books.reduce((sum, book) => sum + book.quantidade_disponivel, 0),
    activeLoans: activeLoans?.total ?? 0,
    suggestionsCount: suggestions?.total ?? 0,
    totalUsers: users?.total ?? 0,
    activeNotices: activeNoticeRows.length,
    featuredNotices: activeNoticeRows.filter((notice) => notice.destaque).slice(0, 3),
  };
};

export const getPublicSiteData = async (): Promise<PublicSiteData> => {
  const [overview, books, reviews, activeNotices, pendingLoans, completedLoans, favorites, students, teachers] =
    await Promise.all([
      getPublicOverview(),
      readBooks(),
      readReviews(),
      readVisibleNotices(null),
      queryOne<{ total: number }>("SELECT COUNT(*)::int AS total FROM loans WHERE status = 'pendente'"),
      queryOne<{ total: number }>("SELECT COUNT(*)::int AS total FROM loans WHERE status = 'devolvido'"),
      queryOne<{ total: number }>('SELECT COUNT(*)::int AS total FROM favorites'),
      queryOne<{ total: number }>("SELECT COUNT(*)::int AS total FROM users WHERE role = 'aluno' AND ativo = TRUE"),
      queryOne<{ total: number }>("SELECT COUNT(*)::int AS total FROM users WHERE role = 'professor' AND ativo = TRUE"),
    ]);

  const serializedBooks = books.map(serializeBook);
  const serializedReviews = reviews.map(serializeReview);
  const visibleNotices = activeNotices.map(serializeNotice);
  const reviewsByBookId = new Map<string, BookReview[]>();

  for (const review of serializedReviews) {
    const current = reviewsByBookId.get(review.livroId) || [];
    current.push(review);
    reviewsByBookId.set(review.livroId, current);
  }

  const topBooks = serializedBooks
    .map((book) => {
      const bookReviews = reviewsByBookId.get(book.id) || [];
      const averageReview =
        bookReviews.length > 0
          ? bookReviews.reduce((total, review) => total + review.nota, 0) / bookReviews.length
          : 0;

      return {
        ...book,
        averageReview,
        reviewCount: bookReviews.length,
        score: averageReview * 100 + bookReviews.length * 8 + book.classificacao * 5 + book.quantidadeDisponivel,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ score: _score, ...book }) => book);

  return {
    overview,
    pendingLoans: pendingLoans?.total ?? 0,
    completedLoans: completedLoans?.total ?? 0,
    totalFavorites: favorites?.total ?? 0,
    totalReviews: serializedReviews.length,
    studentsCount: students?.total ?? 0,
    teachersCount: teachers?.total ?? 0,
    activeNotices: visibleNotices,
    highlightedNotices: visibleNotices.filter((notice) => notice.destaque).slice(0, 3),
    topBooks,
  };
};

export const readUserById = async (userId: string, executor?: QueryExecutor) =>
  queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [userId], executor);

export const readUserByEmail = async (email: string, executor?: QueryExecutor) =>
  queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [normalizeEmail(email)], executor);

export const readBookById = async (bookId: string, executor?: QueryExecutor) =>
  queryOne<BookRow>('SELECT * FROM books WHERE id = $1', [bookId], executor);

export const readBookByTombo = async (numeroTombo: string, executor?: QueryExecutor) =>
  queryOne<BookRow>('SELECT * FROM books WHERE lower(numero_tombo) = lower($1)', [numeroTombo.trim()], executor);

export const readLoanById = async (loanId: string, executor?: QueryExecutor) =>
  queryOne<LoanRow>('SELECT * FROM loans WHERE id = $1', [loanId], executor);

export const readOpenLoanByStudentAndBook = async (studentId: string, bookId: string, executor?: QueryExecutor) =>
  queryOne<LoanRow>(
    "SELECT * FROM loans WHERE aluno_id = $1 AND livro_id = $2 AND status IN ('pendente', 'aprovado') ORDER BY data_pedido DESC LIMIT 1",
    [studentId, bookId],
    executor,
  );

export const readTeacherTokenById = async (tokenId: string, executor?: QueryExecutor) =>
  queryOne<TeacherTokenRow>('SELECT * FROM teacher_tokens WHERE id = $1', [tokenId], executor);

export const readTeacherTokenByToken = async (token: string, executor?: QueryExecutor) =>
  queryOne<TeacherTokenRow>('SELECT * FROM teacher_tokens WHERE lower(token) = lower($1)', [token.trim()], executor);

export const readDocumentById = async (documentId: string, executor?: QueryExecutor) =>
  queryOne<DocumentRow>('SELECT * FROM documents WHERE id = $1', [documentId], executor);

export const readPermissionByKey = async (alunoId: string, livroId: string, executor?: QueryExecutor) =>
  queryOne<PermissionRow>('SELECT * FROM permissions WHERE aluno_id = $1 AND livro_id = $2', [alunoId, livroId], executor);

export const readAuditLogRows = async (executor?: QueryExecutor) =>
  queryRows<AuditLogRow>('SELECT * FROM audit_logs ORDER BY criado_em DESC', [], executor);

export const generateLoanToken = () => {
  const year = new Date().getFullYear();
  return `EMP-${year}-${String(randomInt(100000, 1000000))}`;
};

export const generateTeacherToken = () => {
  const year = new Date().getFullYear();
  return `PROF-${year}-${String(randomInt(100000, 1000000))}`;
};
