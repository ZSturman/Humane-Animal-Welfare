/**
 * Health Check Routes
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '@shelter-link/database';

export async function healthRoutes(app: FastifyInstance) {
  // Basic health check
  app.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  // Detailed health check (includes dependencies)
  app.get('/health/detailed', {
    schema: {
      description: 'Detailed health check with dependency status',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            dependencies: {
              type: 'object',
              properties: {
                database: { type: 'object' },
                redis: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const dependencies: Record<string, { status: string; latency?: number }> = {};

    // Check database
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dependencies.database = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      dependencies.database = { status: 'unhealthy' };
    }

    // Overall status
    const allHealthy = Object.values(dependencies).every(d => d.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      dependencies,
    };
  });
}
