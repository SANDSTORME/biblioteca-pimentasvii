import dotenv from 'dotenv';

dotenv.config();

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseCorsOrigins = (value: string | undefined) =>
  (value || 'http://127.0.0.1:8080,http://localhost:8080')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const parseOptionalNumber = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const parseTrustProxy = (value: string | undefined): boolean | number | string => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return 1;
  }

  if (normalized === 'false') {
    return false;
  }

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return value;
};

export const serverConfig = {
  port: parseNumber(process.env.PORT, 3001),
  jwtSecret: process.env.JWT_SECRET || 'biblioteca-pimentas-vii-dev-secret',
  databaseUrl: process.env.DATABASE_URL?.trim() || '',
  databaseSsl: parseBoolean(process.env.DATABASE_SSL, false),
  databasePoolMax: parseNumber(process.env.DATABASE_POOL_MAX, 20),
  allowInMemoryDatabase: parseBoolean(process.env.ALLOW_IN_MEMORY_DATABASE, false),
  seedDemoData: parseBoolean(process.env.SEED_DEMO_DATA, false),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '256kb',
  publicCacheTtlSeconds: parseNumber(process.env.PUBLIC_CACHE_TTL_SECONDS, 20),
  staticAssetMaxAgeSeconds: parseNumber(process.env.STATIC_ASSET_MAX_AGE_SECONDS, 31536000),
  apiRateLimitPerMinute: parseNumber(process.env.API_RATE_LIMIT_PER_MINUTE, 1200),
  authRateLimitPerMinute: parseNumber(process.env.AUTH_RATE_LIMIT_PER_MINUTE, 30),
  requestTimeoutMs: parseNumber(process.env.REQUEST_TIMEOUT_MS, 30000),
  keepAliveTimeoutMs: parseNumber(process.env.KEEP_ALIVE_TIMEOUT_MS, 65000),
  headersTimeoutMs: parseNumber(process.env.HEADERS_TIMEOUT_MS, 66000),
  appPublicUrl: process.env.APP_PUBLIC_URL?.trim() || '',
  uploadRootDir: process.env.UPLOAD_ROOT_DIR?.trim() || 'data/uploads',
  bookCoverMaxSizeBytes: parseNumber(process.env.BOOK_COVER_MAX_SIZE_BYTES, 5 * 1024 * 1024),
  documentMaxSizeBytes: parseNumber(process.env.DOCUMENT_MAX_SIZE_BYTES, 12 * 1024 * 1024),
  passwordResetExpiryMinutes: parseNumber(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 60),
  passwordResetPreviewEnabled:
    process.env.PASSWORD_RESET_PREVIEW_ENABLED == null
      ? false
      : parseBoolean(process.env.PASSWORD_RESET_PREVIEW_ENABLED, false),
  smtpHost: process.env.SMTP_HOST?.trim() || '',
  smtpPort: parseOptionalNumber(process.env.SMTP_PORT),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER?.trim() || '',
  smtpPass: process.env.SMTP_PASS?.trim() || '',
  mailFrom: process.env.MAIL_FROM?.trim() || 'Biblioteca Pimentas VII <no-reply@bibliotecapimentasvii.local>',
  logLevel: process.env.LOG_LEVEL?.trim().toLowerCase() || 'info',
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME?.trim() || '',
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || '',
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim() || '',
};

export const isProduction = serverConfig.nodeEnv === 'production';

export const isAllowedCorsOrigin = (origin: string | undefined) => {
  if (!origin) {
    return true;
  }

  if (serverConfig.corsOrigins.includes('*')) {
    return true;
  }

  return serverConfig.corsOrigins.includes(origin);
};
