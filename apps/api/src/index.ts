/**
 * Shelter Link API Server (Prototype)
 * 
 * Simplified API for local development.
 * 
 * Changes from production:
 *   - SQLite database
 *   - Local file storage
 *   - No Redis/caching
 *   - Simplified auth (no refresh tokens)
 *   - Removed import/webhook routes (archived)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';

import { logger as pinoLogger } from './lib/logger.js';
import { errorHandler } from './lib/errors.js';

// Routes
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { animalRoutes } from './routes/animals.js';
import { organizationRoutes } from './routes/organizations.js';
import { transferRoutes } from './routes/transfers.js';
import { riskRoutes } from './routes/risk.js';
import { dataRoutes } from './routes/data.js';

// Environment config
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production-min-32-chars';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

// Create Fastify instance
const app = Fastify({
  logger: pinoLogger,
  requestIdHeader: 'x-request-id',
  genReqId: () => crypto.randomUUID(),
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Register plugins
async function registerPlugins() {
  // CORS
  await app.register(cors, {
    origin: CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // JWT authentication
  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: {
      expiresIn: '7d',
    },
  });

  // Multipart file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
      files: 10,
    },
  });

  // Serve uploaded files
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });
}

// Register routes
async function registerRoutes() {
  // Health check (public)
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(healthRoutes, { prefix: '/' }); // Also at root

  // Auth routes (both /api/auth and /auth for compatibility)
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(authRoutes, { prefix: '/auth' });

  // Animal routes (public read, auth write)
  await app.register(animalRoutes, { prefix: '/api/animals' });
  await app.register(animalRoutes, { prefix: '/animals' });

  // Organization routes (includes join requests)
  await app.register(organizationRoutes, { prefix: '/api/organizations' });
  await app.register(organizationRoutes, { prefix: '/organizations' });

  // Transfer routes
  await app.register(transferRoutes, { prefix: '/api/transfers' });
  await app.register(transferRoutes, { prefix: '/transfers' });

  // Risk routes
  await app.register(riskRoutes, { prefix: '/api/risk' });
  await app.register(riskRoutes, { prefix: '/risk' });

  // Data export/import routes
  await app.register(dataRoutes, { prefix: '/api/data' });
  await app.register(dataRoutes, { prefix: '/data' });
}

// Error handler
app.setErrorHandler(errorHandler);

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    await app.listen({
      port: PORT,
      host: '0.0.0.0',
    });

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🐾 Shelter Link API (Prototype)                             ║
║                                                               ║
║   Server:    http://localhost:${PORT}                           ║
║   Health:    http://localhost:${PORT}/health                    ║
║                                                               ║
║   Demo Credentials:                                           ║
║     Admin:      admin@happypaws.org / password123             ║
║     Superadmin: superadmin@shelterlink.org / admin123         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down gracefully...');
  await app.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

export { app };
