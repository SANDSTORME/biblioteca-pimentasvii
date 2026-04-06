import { randomUUID } from 'node:crypto';
import { serverConfig } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const activeLevel = (serverConfig.logLevel as LogLevel) in levelWeight ? (serverConfig.logLevel as LogLevel) : 'info';

const shouldLog = (level: LogLevel) => levelWeight[level] >= levelWeight[activeLevel];

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
};

export const createRequestId = () => randomUUID();

export const logEvent = (level: LogLevel, message: string, metadata?: Record<string, unknown>) => {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  const method = level === 'debug' ? 'log' : level;
  console[method](JSON.stringify(payload));
};

export const logInfo = (message: string, metadata?: Record<string, unknown>) => logEvent('info', message, metadata);
export const logWarn = (message: string, metadata?: Record<string, unknown>) => logEvent('warn', message, metadata);
export const logError = (message: string, error?: unknown, metadata?: Record<string, unknown>) =>
  logEvent('error', message, {
    ...metadata,
    error: error == null ? undefined : serializeError(error),
  });
