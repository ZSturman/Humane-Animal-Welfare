/**
 * Logger Configuration
 * 
 * Pino logger with structured logging
 */

import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.debug ? 'debug' : 'info',
  transport: config.env === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    env: config.env,
    service: 'shelter-link-api',
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'apiKey',
    ],
    censor: '[REDACTED]',
  },
});

// Create child logger for specific modules
export function createLogger(module: string) {
  return logger.child({ module });
}
