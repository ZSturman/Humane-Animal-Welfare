/**
 * Authentication Middleware (Simplified for Prototype)
 * 
 * JWT authentication with optional anonymous access.
 * 
 * TODO: Production - Add these features from _archive/routes/auth.ts:
 *   - Refresh tokens and session storage
 *   - API key authentication
 *   - Rate limiting per user
 *   - Account locking on failed attempts
 *   - Audit logging
 */

import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('auth');
const prisma = new PrismaClient();

// Extend FastifyRequest with user info
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      globalRole: string;
      organizationId?: string;
      organizationRole?: string;
    };
  }
}

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/health',
  '/api/health',
  '/auth/login',
  '/api/auth/login',
  '/organizations/join-request',
  '/api/organizations/join-request',
  '/docs',
];

// Paths that allow anonymous access (but auth is optional)
const ANONYMOUS_ALLOWED_PATHS = [
  '/animals',
  '/api/animals',
  '/organizations',
  '/api/organizations',
];

/**
 * Permission definitions
 */
export const Permissions = {
  // Animal permissions
  'animal:read': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VOLUNTEER', 'READ_ONLY'],
  'animal:write': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'STAFF'],
  'animal:delete': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER'],
  
  // Organization permissions
  'org:read': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VOLUNTEER', 'READ_ONLY'],
  'org:write': ['SUPERADMIN', 'OWNER', 'ADMIN'],
  'org:create': ['SUPERADMIN'],
  'org:users': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER'],
  
  // Join request permissions
  'join:read': ['SUPERADMIN'],
  'join:write': ['SUPERADMIN'],
  
  // Transfer permissions
  'transfer:read': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER', 'STAFF'],
  'transfer:write': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER'],
  
  // Data export/import
  'data:read': ['SUPERADMIN', 'OWNER', 'ADMIN', 'MANAGER'],
  'data:write': ['SUPERADMIN', 'OWNER', 'ADMIN'],
} as const;

export type Permission = keyof typeof Permissions;

/**
 * Check if a role has a permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const allowedRoles = Permissions[permission];
  return allowedRoles?.includes(role as any) ?? false;
}

/**
 * Check if user has permission (checks both global and org role)
 */
export function userHasPermission(
  request: FastifyRequest,
  permission: Permission
): boolean {
  if (!request.user) return false;
  
  // SUPERADMIN can do anything
  if (request.user.globalRole === 'SUPERADMIN') return true;
  
  // Check organization role
  if (request.user.organizationRole) {
    return hasPermission(request.user.organizationRole, permission);
  }
  
  return false;
}

/**
 * Optional auth middleware - sets user if token present, but doesn't require it
 */
export function optionalAuth(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      // No token - continue as anonymous
      request.user = undefined;
      return;
    }
    
    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        email: string;
        name: string;
        globalRole: string;
        orgId?: string;
        orgRole?: string;
      }>();
      
      request.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        globalRole: decoded.globalRole,
        organizationId: decoded.orgId,
        organizationRole: decoded.orgRole,
      };
    } catch (error) {
      // Invalid token - continue as anonymous
      logger.debug({ error }, 'Invalid token, continuing as anonymous');
      request.user = undefined;
    }
  };
}

/**
 * Require authentication middleware
 */
export function requireAuth(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication required');
    }
    
    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        email: string;
        name: string;
        globalRole: string;
        orgId?: string;
        orgRole?: string;
      }>();
      
      request.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        globalRole: decoded.globalRole,
        organizationId: decoded.orgId,
        organizationRole: decoded.orgRole,
      };
    } catch (error) {
      logger.error({ error }, 'JWT verification failed');
      throw new UnauthorizedError('Invalid or expired token');
    }
  };
}

/**
 * Require specific permission middleware
 */
export function requirePermission(permission: Permission): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First ensure user is authenticated
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    // Check permission
    if (!userHasPermission(request, permission)) {
      throw new ForbiddenError(`Permission denied: ${permission}`);
    }
  };
}

/**
 * Require SUPERADMIN role
 */
export function requireSuperAdmin(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    if (request.user.globalRole !== 'SUPERADMIN') {
      throw new ForbiddenError('Superadmin access required');
    }
  };
}

/**
 * Require organization membership
 */
export function requireOrganization(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    if (!request.user.organizationId) {
      throw new ForbiddenError('Organization membership required');
    }
  };
}
