/**
 * Audit Middleware
 * 
 * Logs all API requests for security and compliance
 */

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { prisma } from '@shelter-link/database';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('audit');

// Request methods that should create audit log entries
const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths that should be excluded from audit logs
const EXCLUDED_PATHS = ['/api/health', '/docs'];

/**
 * Extract resource info from URL path
 */
function extractResourceInfo(url: string): { resourceType: string; resourceId?: string } {
  const parts = url.split('/').filter(Boolean);
  
  // Skip 'api' prefix
  if (parts[0] === 'api') {
    parts.shift();
  }
  
  const resourceType = parts[0] ?? 'unknown';
  const resourceId = parts[1] && !parts[1].startsWith('?') ? parts[1] : undefined;
  
  return { resourceType, resourceId };
}

/**
 * Audit middleware hook
 */
export async function auditMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction
) {
  // Skip non-audited methods
  if (!AUDITED_METHODS.includes(request.method)) {
    return done();
  }
  
  // Skip excluded paths
  if (EXCLUDED_PATHS.some(path => request.url.startsWith(path))) {
    return done();
  }
  
  // Store start time for response timing
  request.auditStartTime = Date.now();
  
  done();
}

/**
 * Create audit log entry after request completes
 */
export async function createAuditLog(
  request: FastifyRequest,
  action: string,
  resourceType: string,
  resourceId?: string,
  changes?: Record<string, { old: unknown; new: unknown }>,
  metadata?: Record<string, unknown>
) {
  try {
    const user = request.user;
    const organization = request.organization;
    
    await prisma.auditLog.create({
      data: {
        userId: user?.id,
        organizationId: organization?.id,
        action,
        resourceType,
        resourceId,
        changes: changes ? formatChanges(changes) : undefined,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        requestId: request.id,
        metadata: metadata ?? {},
      },
    });
    
    logger.debug({
      action,
      resourceType,
      resourceId,
      userId: user?.id,
      organizationId: organization?.id,
    }, 'Audit log created');
  } catch (error) {
    logger.error({ error }, 'Failed to create audit log');
  }
}

/**
 * Format changes for storage
 */
function formatChanges(changes: Record<string, { old: unknown; new: unknown }>) {
  return Object.entries(changes).map(([field, { old: oldValue, new: newValue }]) => ({
    field,
    oldValue,
    newValue,
  }));
}

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    auditStartTime?: number;
    user?: {
      id: string;
      email: string;
      name: string;
      role?: string;
    } | null;
    organization?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }
}
