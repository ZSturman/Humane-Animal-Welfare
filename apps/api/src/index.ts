/**
 * Shelter Link API Server
 * 
 * Main entry point for the REST API
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';

import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './lib/errors.js';
import { auditMiddleware } from './middleware/audit.js';
import { authMiddleware } from './middleware/auth.js';

// Routes
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { animalRoutes } from './routes/animals.js';
import { organizationRoutes } from './routes/organizations.js';
import { transferRoutes } from './routes/transfers.js';
import { importRoutes } from './routes/import.js';
import { webhookRoutes } from './routes/webhooks.js';
import { riskRoutes } from './routes/risk.js';

// Create Fastify instance
const app = Fastify({
  logger: logger,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  genReqId: () => crypto.randomUUID(),
});

// Register plugins
async function registerPlugins() {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Organization-ID'],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      // Rate limit by API key if present, otherwise by IP
      return request.headers['x-api-key']?.toString() ?? request.ip;
    },
  });

  // JWT authentication
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
  });

  // Multipart uploads
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
      files: 10,
    },
  });

  // WebSocket support
  await app.register(websocket);

  // OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Shelter Link API',
        description: 'Unified Humane Animal Shelter Platform API',
        version: '1.0.0',
        contact: {
          name: 'Shelter Link Team',
          email: 'api@shelterlink.org',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: config.api.baseUrl,
          description: 'API Server',
        },
      ],
      tags: [
        { name: 'Animals', description: 'Animal management operations' },
        { name: 'Organizations', description: 'Shelter and rescue organization management' },
        { name: 'Transfers', description: 'Cross-shelter transfer requests' },
        { name: 'Risk', description: 'Risk assessment and urgency scoring' },
        { name: 'Import', description: 'Data ingestion and import operations' },
        { name: 'Webhooks', description: 'Webhook management for integrations' },
        { name: 'Auth', description: 'Authentication and authorization' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

// Register middleware
async function registerMiddleware() {
  // Audit logging
  app.addHook('onRequest', auditMiddleware);
  
  // Auth middleware (decorate request with user)
  app.decorateRequest('user', null);
  app.decorateRequest('organization', null);
  app.addHook('onRequest', authMiddleware);
}

// Register routes
async function registerRoutes() {
  // Health check (public)
  await app.register(healthRoutes, { prefix: '/api' });
  
  // Auth routes (public)
  await app.register(authRoutes, { prefix: '/api/auth' });
  
  // Protected routes
  await app.register(animalRoutes, { prefix: '/api/animals' });
  await app.register(organizationRoutes, { prefix: '/api/organizations' });
  await app.register(transferRoutes, { prefix: '/api/transfers' });
  await app.register(riskRoutes, { prefix: '/api/risk' });
  await app.register(importRoutes, { prefix: '/api/import' });
  await app.register(webhookRoutes, { prefix: '/api/webhooks' });
}

// Error handler
app.setErrorHandler(errorHandler);

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerMiddleware();
    await registerRoutes();

    await app.listen({
      port: config.api.port,
      host: '0.0.0.0',
    });

    logger.info(`🐾 Shelter Link API running on port ${config.api.port}`);
    logger.info(`📚 API docs available at ${config.api.baseUrl}/docs`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');
  await app.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

export { app };
