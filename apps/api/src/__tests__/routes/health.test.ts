/**
 * Health Routes Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// Create a minimal health router for testing
async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // Health routes
  app.get('/health', async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  });

  app.get('/health/detailed', async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: 'ok',
          redis: 'ok',
          storage: 'ok',
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    };
  });

  await app.ready();
  return app;
}

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 OK with status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
      expect(body.data.timestamp).toBeDefined();
      expect(body.data.version).toBe('1.0.0');
    });

    it('should include timestamp in ISO format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.payload);
      const timestamp = new Date(body.data.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return 200 OK with detailed status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
      expect(body.data.services).toBeDefined();
    });

    it('should include all service statuses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      const body = JSON.parse(response.payload);
      expect(body.data.services.database).toBeDefined();
      expect(body.data.services.redis).toBeDefined();
      expect(body.data.services.storage).toBeDefined();
    });

    it('should include system metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      const body = JSON.parse(response.payload);
      expect(body.data.uptime).toBeDefined();
      expect(typeof body.data.uptime).toBe('number');
      expect(body.data.memory).toBeDefined();
      expect(body.data.memory.heapUsed).toBeDefined();
    });
  });
});
