import { existsSync } from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import morgan from 'morgan';
import { User } from '../src/types';
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  resolveUserFromToken,
  validatePasswordResetToken,
} from './auth';
import { getAuditTrail } from './audit';
import { closeDatabase, getPublicOverview, getPublicSiteData, initDatabase, LibrarySnapshot, PublicOverview, PublicSiteData } from './db';
import { isAllowedCorsOrigin, isProduction, serverConfig } from './config';
import {
  approveLoan,
  createBook,
  createDocument,
  createNotice,
  createSuggestion,
  createTeacherTokenAction,
  createTicket,
  createUser,
  deleteDocument,
  deleteBook,
  getLibrarySnapshotForUser,
  isDomainError,
  rejectLoan,
  requestLoan,
  returnLoan,
  savePermission,
  saveReview,
  toggleFavorite,
  toggleNoticeHighlight,
  toggleNoticeStatus,
  toggleTeacherToken,
  toggleUserStatus,
  updateDocument,
  updateBook,
  updateTicket,
} from './library';
import { logError, logInfo, createRequestId } from './logger';
import { getAdminReports } from './reports';
import {
  AssetValidationError,
  assertUploadedAssetIsSafe,
  buildUploadedAssetPayload,
  createUploadMiddleware,
  ensureAssetDirectories,
  getAssetsRoot,
} from './storage';

type AuthedRequest = Request & {
  user: User | null;
  requestId: string;
};

type TimedCache<T> = {
  expiresAt: number;
  value: T;
};

const app = express();
const publicCache = {
  overview: null as TimedCache<PublicOverview> | null,
  siteData: null as TimedCache<PublicSiteData> | null,
  library: null as TimedCache<LibrarySnapshot> | null,
};

const cacheDurationMs = serverConfig.publicCacheTtlSeconds * 1000;
const staticAssetMaxAge = `${serverConfig.staticAssetMaxAgeSeconds}s`;

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? serverConfig.apiRateLimitPerMinute : 3000,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isProduction ? serverConfig.authRateLimitPerMinute : 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.disable('x-powered-by');
app.set('etag', 'strong');
if (serverConfig.trustProxy !== false) {
  app.set('trust proxy', serverConfig.trustProxy);
}

app.use((request, response, next) => {
  const authedRequest = request as AuthedRequest;
  authedRequest.requestId = createRequestId();
  response.setHeader('X-Request-Id', authedRequest.requestId);
  next();
});
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedCorsOrigin(origin));
    },
    credentials: false,
    maxAge: 86400,
  }),
);
app.use(compression({ threshold: 1024 }));
app.use(
  '/api/assets',
  express.static(getAssetsRoot(), {
    fallthrough: false,
    maxAge: isProduction ? '7d' : 0,
    immutable: isProduction,
    setHeaders(response) {
      response.setHeader('Cache-Control', isProduction ? 'public, max-age=604800, immutable' : 'no-store');
    },
  }),
);
app.use(express.json({ limit: serverConfig.jsonBodyLimit }));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use('/api', readLimiter);

const invalidatePublicCache = () => {
  publicCache.overview = null;
  publicCache.siteData = null;
  publicCache.library = null;
};

const setPublicCacheHeaders = (response: Response) => {
  response.setHeader(
    'Cache-Control',
    `public, max-age=${serverConfig.publicCacheTtlSeconds}, stale-while-revalidate=${serverConfig.publicCacheTtlSeconds * 2}`,
  );
};

const withTimedCache = async <T>(cache: TimedCache<T> | null, factory: () => Promise<T>): Promise<TimedCache<T>> => {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache;
  }

  return {
    value: await factory(),
    expiresAt: now + cacheDurationMs,
  };
};

const getBearerToken = (request: Request) => {
  const value = request.headers.authorization;
  if (!value || !value.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return value.slice(7).trim();
};

const getRouteParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value || '');

const optionalAuth = async (request: Request, _response: Response, next: NextFunction) => {
  const authedRequest = request as AuthedRequest;
  const token = getBearerToken(request);

  if (!token) {
    authedRequest.user = null;
    next();
    return;
  }

  try {
    authedRequest.user = await resolveUserFromToken(token);
  } catch {
    authedRequest.user = null;
  }

  next();
};

const requireAuth = async (request: Request, response: Response, next: NextFunction) => {
  const authedRequest = request as AuthedRequest;
  const token = getBearerToken(request);

  if (!token) {
    response.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
    return;
  }

  try {
    authedRequest.user = await resolveUserFromToken(token);
    next();
  } catch {
    authedRequest.user = null;
    response.status(401).json({ success: false, message: 'Sessao invalida ou expirada.' });
  }
};

const requireAdmin = (request: Request, response: Response, next: NextFunction) => {
  const authedRequest = request as AuthedRequest;
  if (authedRequest.user?.role !== 'admin') {
    response.status(403).json({ success: false, message: 'Você não tem permissão para executar esta ação.' });
    return;
  }

  next();
};

const asyncHandler =
  (
    handler: (request: Request, response: Response, next: NextFunction) => Promise<void> | void,
  ) =>
  (request: Request, response: Response, next: NextFunction) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };

const respondWithAction = <T extends { success: boolean }>(
  response: Response,
  result: T,
  status = 200,
  invalidateCache = false,
) => {
  if (invalidateCache && result.success) {
    invalidatePublicCache();
  }

  response.status(status).json(result);
};

app.get('/api/health', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.json({ status: 'ok', date: new Date().toISOString(), environment: serverConfig.nodeEnv });
});

app.get(
  '/api/public/overview',
  asyncHandler(async (_request, response) => {
    publicCache.overview = await withTimedCache(publicCache.overview, getPublicOverview);
    setPublicCacheHeaders(response);
    response.json({ success: true, overview: publicCache.overview.value });
  }),
);

app.get(
  '/api/public/site-data',
  asyncHandler(async (_request, response) => {
    publicCache.siteData = await withTimedCache(publicCache.siteData, getPublicSiteData);
    setPublicCacheHeaders(response);
    response.json({ success: true, data: publicCache.siteData.value });
  }),
);

app.get(
  '/api/library',
  optionalAuth,
  asyncHandler(async (request, response) => {
    response.vary('Authorization');
    const actor = (request as AuthedRequest).user;

    if (!actor) {
      publicCache.library = await withTimedCache(publicCache.library, () => getLibrarySnapshotForUser(null));
      setPublicCacheHeaders(response);
      response.json({ success: true, snapshot: publicCache.library.value });
      return;
    }

    response.setHeader('Cache-Control', 'private, no-store');
    const snapshot = await getLibrarySnapshotForUser(actor);
    response.json({ success: true, snapshot });
  }),
);

app.post(
  '/api/auth/login',
  authLimiter,
  asyncHandler(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const { email, senha } = request.body ?? {};
    const result = await loginUser(String(email ?? ''), String(senha ?? ''));
    if (!result.success) {
      response.status(401).json(result);
      return;
    }

    response.json(result);
  }),
);

app.post(
  '/api/auth/register',
  authLimiter,
  asyncHandler(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const { nome, email, senha, role, turma, token } = request.body ?? {};
    const result = await registerUser({
      nome: String(nome ?? ''),
      email: String(email ?? ''),
      senha: String(senha ?? ''),
      role,
      turma: turma ? String(turma) : undefined,
      token: token ? String(token) : undefined,
    });

    if (!result.success) {
      response.status(400).json(result);
      return;
    }

    respondWithAction(response, result, 201, true);
  }),
);

app.post(
  '/api/auth/forgot-password',
  authLimiter,
  asyncHandler(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const result = await requestPasswordReset(String(request.body?.email ?? ''), request.ip);
    response.json(result);
  }),
);

app.get(
  '/api/auth/reset-password/validate',
  asyncHandler(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const result = await validatePasswordResetToken(String(request.query.token ?? ''));
    if (!result.success) {
      response.status(400).json(result);
      return;
    }

    response.json(result);
  }),
);

app.post(
  '/api/auth/reset-password',
  authLimiter,
  asyncHandler(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const result = await resetPassword(String(request.body?.token ?? ''), String(request.body?.senha ?? ''));
    if (!result.success) {
      response.status(400).json(result);
      return;
    }

    response.json(result);
  }),
);

app.get(
  '/api/auth/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.json({ success: true, user: (request as AuthedRequest).user });
  }),
);

app.post('/api/auth/logout', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.json({ success: true, message: 'Sessao encerrada.' });
});

app.post(
  '/api/users',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await createUser((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 201, true);
  }),
);

app.patch(
  '/api/users/:id/toggle-status',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await toggleUserStatus((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/books',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await createBook((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 201, true);
  }),
);

app.put(
  '/api/books/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await updateBook((request as AuthedRequest).user, getRouteParam(request.params.id), request.body);
    respondWithAction(response, result, 200, true);
  }),
);

app.delete(
  '/api/books/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await deleteBook((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/uploads/book-cover',
  requireAuth,
  requireAdmin,
  createUploadMiddleware('books', 'capa'),
  asyncHandler(async (request, response) => {
    const file = request.file;
    if (!file) {
      response.status(400).json({ success: false, message: 'Envie um arquivo de capa para continuar.' });
      return;
    }

    await assertUploadedAssetIsSafe('books', file);

    response.status(201).json({
      success: true,
      message: 'Capa enviada com sucesso.',
      asset: buildUploadedAssetPayload(file),
    });
  }),
);

app.post(
  '/api/uploads/document',
  requireAuth,
  requireAdmin,
  createUploadMiddleware('documents', 'arquivo'),
  asyncHandler(async (request, response) => {
    const file = request.file;
    if (!file) {
      response.status(400).json({ success: false, message: 'Envie um arquivo para continuar.' });
      return;
    }

    await assertUploadedAssetIsSafe('documents', file);

    response.status(201).json({
      success: true,
      message: 'Arquivo enviado com sucesso.',
      asset: buildUploadedAssetPayload(file),
    });
  }),
);

app.post(
  '/api/loans/request',
  requireAuth,
  asyncHandler(async (request, response) => {
    const { bookId, alunoId } = request.body ?? {};
    const result = await requestLoan((request as AuthedRequest).user, String(bookId ?? ''), alunoId);
    respondWithAction(response, result, 201, true);
  }),
);

app.post(
  '/api/loans/:id/approve',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await approveLoan((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/loans/:id/reject',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await rejectLoan(
      (request as AuthedRequest).user,
      getRouteParam(request.params.id),
      request.body?.observacao,
    );
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/loans/:id/return',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await returnLoan((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/suggestions',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await createSuggestion((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 201, true);
  }),
);

app.post(
  '/api/tickets',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await createTicket((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 201, false);
  }),
);

app.patch(
  '/api/tickets/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await updateTicket((request as AuthedRequest).user, getRouteParam(request.params.id), request.body);
    respondWithAction(response, result, 200, false);
  }),
);

app.post(
  '/api/teacher-tokens',
  requireAuth,
  asyncHandler(async (request, response) => {
    const { descricao, turmasPermitidas } = request.body ?? {};
    const result = await createTeacherTokenAction(
      (request as AuthedRequest).user,
      String(descricao ?? ''),
      Array.isArray(turmasPermitidas) ? turmasPermitidas : [],
    );
    respondWithAction(response, result, 201, true);
  }),
);

app.patch(
  '/api/teacher-tokens/:id/toggle',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await toggleTeacherToken((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.put(
  '/api/permissions',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await savePermission((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/favorites/toggle',
  requireAuth,
  asyncHandler(async (request, response) => {
    const { bookId, usuarioId } = request.body ?? {};
    const result = await toggleFavorite((request as AuthedRequest).user, String(bookId ?? ''), usuarioId);
    respondWithAction(response, result, 200, true);
  }),
);

app.put(
  '/api/reviews',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await saveReview((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/notices',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await createNotice((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 201, true);
  }),
);

app.patch(
  '/api/notices/:id/toggle-status',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await toggleNoticeStatus((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.patch(
  '/api/notices/:id/toggle-highlight',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await toggleNoticeHighlight((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.post(
  '/api/documents',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await createDocument((request as AuthedRequest).user, request.body);
    respondWithAction(response, result, 201, true);
  }),
);

app.put(
  '/api/documents/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await updateDocument((request as AuthedRequest).user, getRouteParam(request.params.id), request.body);
    respondWithAction(response, result, 200, true);
  }),
);

app.delete(
  '/api/documents/:id',
  requireAuth,
  asyncHandler(async (request, response) => {
    const result = await deleteDocument((request as AuthedRequest).user, getRouteParam(request.params.id));
    respondWithAction(response, result, 200, true);
  }),
);

app.get(
  '/api/admin/reports',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.json({ success: true, reports: await getAdminReports() });
  }),
);

app.get(
  '/api/admin/audit',
  requireAuth,
  requireAdmin,
  asyncHandler(async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.json({
      success: true,
      logs: await getAuditTrail({
        acao: request.query.acao ? String(request.query.acao) as never : undefined,
        atorId: request.query.atorId ? String(request.query.atorId) : undefined,
        dataInicial: request.query.dataInicial ? String(request.query.dataInicial) : undefined,
        dataFinal: request.query.dataFinal ? String(request.query.dataFinal) : undefined,
      }),
    });
  }),
);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (isDomainError(error)) {
    response.status(error.status).json({ success: false, message: error.message });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(400).json({ success: false, message: 'Falha no upload do arquivo.' });
    return;
  }

  if (error instanceof AssetValidationError) {
    response.status(400).json({ success: false, message: error.message });
    return;
  }

  const requestId = (_request as AuthedRequest).requestId;
  logError('Erro não tratado na API.', error, { requestId, path: _request.path, method: _request.method });
  response.status(500).json({ success: false, message: 'Erro interno do servidor.' });
});

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const appRoot = path.basename(currentDirectory) === 'dist-server' ? path.resolve(currentDirectory, '..') : process.cwd();
const distPath = path.resolve(appRoot, 'dist');
const distIndexPath = path.join(distPath, 'index.html');

if (existsSync(distIndexPath)) {
  app.use(
    express.static(distPath, {
      index: false,
      setHeaders(response, filePath) {
        const normalized = filePath.toLowerCase();

        if (normalized.endsWith('index.html')) {
          response.setHeader('Cache-Control', 'no-cache');
          return;
        }

        if (normalized.includes(`${path.sep}assets${path.sep}`) || normalized.includes(`${path.sep}brand${path.sep}`)) {
          response.setHeader('Cache-Control', `public, max-age=${serverConfig.staticAssetMaxAgeSeconds}, immutable`);
          return;
        }

        response.setHeader('Cache-Control', 'public, max-age=3600');
      },
      maxAge: staticAssetMaxAge,
    }),
  );

  app.use((request, response, next) => {
    if (request.path.startsWith('/api/')) {
      next();
      return;
    }

    response.sendFile(distIndexPath);
  });
}

const server = http.createServer(app);
server.keepAliveTimeout = serverConfig.keepAliveTimeoutMs;
server.headersTimeout = serverConfig.headersTimeoutMs;
server.requestTimeout = serverConfig.requestTimeoutMs;

const shutdown = async (signal: string) => {
  logInfo(`Recebido ${signal}. Encerrando servidor da Biblioteca Pimentas VII...`);
  server.close(async () => {
    try {
      await closeDatabase();
    } catch (error) {
      logError('Falha ao fechar o banco de dados.', error);
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

const startServer = async () => {
  ensureAssetDirectories();
  await initDatabase();

  server.listen(serverConfig.port, () => {
    logInfo('Biblioteca Pimentas VII API pronta para uso.', {
      port: serverConfig.port,
      environment: serverConfig.nodeEnv,
    });
  });
};

void startServer().catch((error) => {
  logError('Falha ao iniciar a Biblioteca Pimentas VII.', error);
  process.exit(1);
});
